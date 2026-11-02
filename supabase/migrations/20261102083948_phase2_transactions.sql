create function private.soft_delete_order(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.current_role() not in ('admin','editor') or private.current_role() is null then raise insufficient_privilege; end if;
 update public.orders set deleted_at=now() where id=target and deleted_at is null;
 if not found then raise no_data_found; end if;
end $$;
revoke all on function private.soft_delete_order(uuid) from public,anon;
grant execute on function private.soft_delete_order(uuid) to authenticated;
create function public.soft_delete_order(target uuid) returns void language sql security invoker set search_path='' as $$select private.soft_delete_order(target)$$;
revoke all on function public.soft_delete_order(uuid) from public,anon;
grant execute on function public.soft_delete_order(uuid) to authenticated;

create function public.begin_sync(job text,trigger_kind text,key_input text,actor uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result public.sync_runs;
begin
 perform pg_advisory_xact_lock(763025);
 update public.sync_runs set status='failed',finished_at=now(),error_message='Previous worker exceeded its 10-minute lease' where status='running' and started_at<now()-interval '10 minutes';
 select * into result from public.sync_runs where idempotency_key=key_input;
 if found then return jsonb_build_object('run',to_jsonb(result),'acquired',false); end if;
 if exists(select 1 from public.sync_runs where status='running') then raise unique_violation using message='Sync already running'; end if;
 insert into public.sync_runs(job_type,trigger_type,status,business_date,idempotency_key,initiated_by)
 values(job,trigger_kind,'running',(now() at time zone 'Asia/Ho_Chi_Minh')::date,key_input,actor) returning * into result;
 return jsonb_build_object('run',to_jsonb(result),'acquired',true);
end $$;
revoke all on function public.begin_sync(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.begin_sync(text,text,text,uuid) to service_role;

create function private.import_orders(rows_input jsonb,run_id uuid,hash_input text) returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb; inserted_count integer:=0;
begin
 if auth.uid() is null or private.current_role() is distinct from 'admin' then raise insufficient_privilege; end if;
 if jsonb_typeof(rows_input)<>'array' or jsonb_array_length(rows_input)=0 or jsonb_array_length(rows_input)>5000 then raise check_violation using message='Invalid import size'; end if;
 perform 1 from public.sync_runs where id=run_id and status='running' and job_type='import' and initiated_by=auth.uid() and started_at>now()-interval '9 minutes' for update;
 if not found then raise check_violation using message='Import lease expired'; end if;
 lock table public.orders in share row exclusive mode;
 if exists(select 1 from public.orders) then raise unique_violation using message='Initial import requires an empty Orders table'; end if;
 for item in select value from jsonb_array_elements(rows_input) loop
   insert into public.orders(order_code,customer_name,order_date,status,total_amount,note)
   values(item->>'order_code',item->>'customer_name',(item->>'order_date')::date,item->>'status',(item->>'total_amount')::bigint,coalesce(item->>'note',''));
   inserted_count:=inserted_count+1;
 end loop;
 update public.sync_runs set status='success',row_count=inserted_count,snapshot_hash=hash_input,finished_at=now() where id=run_id;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data) values(auth.uid(),'import','sync_runs',run_id::text,jsonb_build_object('row_count',inserted_count,'snapshot_hash',hash_input));
 return inserted_count;
end $$;
revoke all on function private.import_orders(jsonb,uuid,text) from public,anon;
grant execute on function private.import_orders(jsonb,uuid,text) to authenticated;
create function public.import_orders(rows_input jsonb,run_id uuid,hash_input text) returns integer language sql security invoker set search_path='' as $$ select private.import_orders(rows_input,run_id,hash_input) $$;
revoke all on function public.import_orders(jsonb,uuid,text) from public,anon;
grant execute on function public.import_orders(jsonb,uuid,text) to authenticated;

-- One statement, one MVCC snapshot. Bounded by the server before publishing.
create function public.export_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(o) order by o.order_code),'[]'::jsonb) from
 (select id,order_code,customer_name,order_date,status,total_amount::text,note,created_at,updated_at,updated_by,deleted_at from public.orders where deleted_at is null order by order_code limit 8001) o;
$$;
revoke all on function public.export_snapshot() from public,anon,authenticated;
grant execute on function public.export_snapshot() to service_role;

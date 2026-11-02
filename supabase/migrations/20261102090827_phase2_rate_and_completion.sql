create table private.mutation_limits(actor uuid not null references auth.users(id) on delete cascade,bucket text not null,window_start timestamptz not null,hits integer not null,primary key(actor,bucket));
alter table private.mutation_limits enable row level security;
revoke all on private.mutation_limits from public,anon,authenticated;
create function private.consume_mutation(bucket_input text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; ceiling integer;
begin
 if auth.uid() is null or private.current_role() is null then raise insufficient_privilege; end if;
 ceiling:=case bucket_input when 'orders' then 120 when 'admin' then 30 when 'sync' then 6 else 0 end;
 if ceiling=0 then raise check_violation; end if;
 insert into private.mutation_limits(actor,bucket,window_start,hits) values(auth.uid(),bucket_input,date_trunc('minute',now()),1)
 on conflict(actor,bucket) do update set hits=case when mutation_limits.window_start=excluded.window_start then mutation_limits.hits+1 else 1 end,window_start=excluded.window_start returning hits into n;
 return n<=ceiling;
end $$;
revoke all on function private.consume_mutation(text) from public,anon;
grant execute on function private.consume_mutation(text) to authenticated;
create function public.consume_mutation(bucket_input text) returns boolean language sql security invoker set search_path='' as $$select private.consume_mutation(bucket_input)$$;
revoke all on function public.consume_mutation(text) from public,anon;
grant execute on function public.consume_mutation(text) to authenticated;

create function public.complete_export(run_id uuid,count_input integer,hash_input text) returns void language plpgsql security invoker set search_path='' as $$
declare actor uuid;
begin
 update public.sync_runs set status='success',row_count=count_input,snapshot_hash=hash_input,finished_at=now()
 where id=run_id and status='running' and started_at>now()-interval '2 minutes' returning initiated_by into actor;
 if not found then raise check_violation using message='Export completion lease expired'; end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data) values(actor,'export','sync_runs',run_id::text,jsonb_build_object('row_count',count_input,'snapshot_hash',hash_input));
end $$;
revoke all on function public.complete_export(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.complete_export(uuid,integer,text) to service_role;

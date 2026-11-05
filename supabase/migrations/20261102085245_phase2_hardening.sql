-- Platform-created event-trigger helper is not a public application RPC.
-- Some Supabase projects provide this platform helper; fresh installations may
-- not. Keep its privilege hardening when present without requiring its creation.
do $$
begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
create index profiles_role_active on public.profiles(role) where is_active;
create index orders_updated_by on public.orders(updated_by);
create index audit_actor on public.audit_logs(actor_id);
create index sync_actor on public.sync_runs(initiated_by);

create function private.can_import() returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or private.current_role() is distinct from 'admin' then raise insufficient_privilege; end if;
 return not exists(select 1 from public.orders);
end $$;
revoke all on function private.can_import() from public,anon;
grant execute on function private.can_import() to authenticated;
create function public.can_import() returns boolean language sql stable security invoker set search_path='' as $$select private.can_import()$$;
revoke all on function public.can_import() from public,anon;
grant execute on function public.can_import() to authenticated;

create function public.report_snapshot(date_from date default null,date_to date default null,status_filter text default null,query_input text default '')
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.order_code),'[]'::jsonb) from
 (select id,order_code,customer_name,order_date,status,total_amount::text,note,created_at,updated_at,updated_by,deleted_at from public.orders
 where deleted_at is null and (date_from is null or order_date>=date_from) and (date_to is null or order_date<=date_to)
 and (status_filter is null or status=status_filter) and (query_input='' or position(lower(query_input) in lower(order_code||' '||customer_name))>0)
 order by order_code limit 8001)r;
$$;
revoke all on function public.report_snapshot(date,date,text,text) from public,anon;
grant execute on function public.report_snapshot(date,date,text,text) to authenticated;

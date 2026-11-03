-- Preserve existing history. New events capture trusted actor identity at insertion.
alter table public.audit_logs add column actor_name text;
alter table public.audit_logs add column actor_role text check (actor_role in ('admin','editor','viewer','system'));
create function private.capture_audit_actor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.actor_id is null then
  new.actor_name:='System'; new.actor_role:='system';
 else
  select p.full_name,p.role into new.actor_name,new.actor_role from public.profiles p where p.id=new.actor_id;
 end if;
 return new;
end $$;
revoke all on function private.capture_audit_actor() from public,anon,authenticated;
create trigger audit_actor_snapshot before insert on public.audit_logs
for each row execute function private.capture_audit_actor();

create function public.audit_page(
 page_input integer default 1, size_input integer default 50,
 role_input text default null, action_input text default null, resource_input text default null,
 date_from date default null, date_to date default null, query_input text default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or private.current_role() is distinct from 'admin' then raise insufficient_privilege; end if;
 if page_input is null or page_input<1 or size_input is null or size_input<1 or size_input>100
  or (role_input is not null and role_input not in ('admin','editor','viewer','system','unknown'))
  or (action_input is not null and action_input not in ('created','updated','deleted','hidden','restored','import','export'))
  or (resource_input is not null and resource_input not in ('orders','profiles','workspace_settings','sync_runs'))
  or length(coalesce(query_input,''))>100 or (date_from is not null and date_to is not null and date_from>date_to)
 then raise invalid_parameter_value; end if;
 with decorated as (
  select a.id,a.created_at,a.action,a.resource_type,
   case when a.actor_id is null then 'System' else coalesce(a.actor_name,p.full_name,'Unknown user') end as actor_name,
   case when a.actor_id is null then 'system' else coalesce(a.actor_role,p.role,'unknown') end as actor_role,
   case when a.actor_id is null then 'system' when a.actor_role is not null then 'snapshot' when p.id is not null then 'current' else 'unknown' end as actor_context,
   case a.resource_type
    when 'orders' then coalesce(a.after_data->>'order_code',a.before_data->>'order_code','')
    when 'profiles' then coalesce(a.after_data->>'full_name',a.before_data->>'full_name','')
    when 'workspace_settings' then coalesce(a.after_data->>'organization',a.before_data->>'organization','')
    else '' end as resource_label,
   jsonb_strip_nulls(jsonb_build_object(
    'status_before',a.before_data->>'status','status_after',a.after_data->>'status',
    'amount_before',a.before_data->>'total_amount','amount_after',a.after_data->>'total_amount',
    'role_before',a.before_data->>'role','role_after',a.after_data->>'role',
    'active_before',a.before_data->>'is_active','active_after',a.after_data->>'is_active',
    'name_before',a.before_data->>'full_name','name_after',a.after_data->>'full_name',
    'organization_before',a.before_data->>'organization','organization_after',a.after_data->>'organization',
    'row_count',a.after_data->>'row_count'
   )) as details
  from public.audit_logs a left join public.profiles p on p.id=a.actor_id
  where (date_from is null or a.created_at >= (date_from::timestamp at time zone 'Asia/Ho_Chi_Minh'))
    and (date_to is null or a.created_at < ((date_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'))
    and (action_input is null or a.action=action_input)
    and (resource_input is null or a.resource_type=resource_input)
 ), filtered as materialized (
  select d.* from decorated d where (role_input is null or d.actor_role=role_input)
   and (nullif(trim(query_input),'') is null or position(lower(trim(query_input)) in lower(d.actor_name||' '||d.resource_label))>0)
 ), counted as (select count(*) as total from filtered), paging as (
  select total,least(page_input::bigint,greatest(1::bigint,(total+size_input-1)/size_input)) as page from counted
 ) select jsonb_build_object('total',total,'page',page,'pageSize',size_input,'events',coalesce((
  select jsonb_agg(to_jsonb(rows) order by rows.created_at desc,rows.id desc) from (
   select * from filtered order by created_at desc,id desc
   limit size_input offset ((select page from paging)-1)*size_input
  ) rows
 ),'[]'::jsonb)) into result from paging;
 return result;
end $$;
revoke all on function public.audit_page(integer,integer,text,text,text,date,date,text) from public,anon;
grant execute on function public.audit_page(integer,integer,text,text,text,date,date,text) to authenticated;

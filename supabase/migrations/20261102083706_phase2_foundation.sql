-- Phase 2: additive foundation. No seed data; no changes to auth.users or Sheets.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id), full_name text not null check(length(trim(full_name)) between 1 and 200),
 email text not null unique, role text not null default 'viewer' check(role in ('admin','editor','viewer')),
 is_active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), order_code text not null unique check(order_code ~ '^[A-Z0-9-]{1,40}$'),
 customer_name text not null check(length(trim(customer_name)) between 1 and 200), order_date date not null,
 status text not null check(status in ('pending','completed','cancelled')), total_amount bigint not null check(total_amount >= 0),
 note text not null default '' check(length(note)<=2000), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id), deleted_at timestamptz
);
create index orders_date_active on public.orders(order_date desc,id) where deleted_at is null;
create index orders_status_date_active on public.orders(status,order_date desc) where deleted_at is null;
create index orders_amount_active on public.orders(total_amount,id) where deleted_at is null;
create table public.sync_runs (
 id uuid primary key default gen_random_uuid(), job_type text not null check(job_type in ('import','export')),
 trigger_type text not null check(trigger_type in ('manual','cron')), status text not null check(status in ('running','success','failed')),
 business_date date not null, idempotency_key text not null unique, snapshot_hash text,
 row_count integer not null default 0 check(row_count>=0), error_message text,
 started_at timestamptz not null default now(), finished_at timestamptz, initiated_by uuid references public.profiles(id)
);
create unique index sync_one_running on public.sync_runs((true)) where status='running';
create index sync_runs_started on public.sync_runs(started_at desc);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null,
 resource_type text not null, resource_id text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create index audit_logs_created on public.audit_logs(created_at desc);
create table public.workspace_settings (id boolean primary key default true check(id), organization text not null check(length(trim(organization)) between 1 and 100));
insert into public.workspace_settings(id,organization) values(true,'SheetOps');

create function private.current_role() returns text language sql stable security definer set search_path='' as $$
 select p.role from public.profiles p where p.id=(select auth.uid()) and p.is_active
$$;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.sync_runs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workspace_settings enable row level security;
revoke all on public.profiles,public.orders,public.sync_runs,public.audit_logs,public.workspace_settings from anon,authenticated;
grant select on public.profiles,public.orders,public.sync_runs,public.audit_logs,public.workspace_settings to authenticated;
grant insert,update on public.orders to authenticated;
grant update on public.workspace_settings to authenticated;
grant all on public.profiles,public.orders,public.sync_runs,public.audit_logs,public.workspace_settings to service_role;
create policy profiles_read on public.profiles for select to authenticated using ((id=(select auth.uid()) and is_active) or (select private.current_role())='admin');
create policy orders_read on public.orders for select to authenticated using ((select private.current_role()) in ('admin','editor','viewer') and deleted_at is null);
create policy orders_insert on public.orders for insert to authenticated with check ((select private.current_role()) in ('admin','editor') and deleted_at is null);
-- Soft-deleted records remain hidden to readers, but the mutation policy permits setting deleted_at.
create policy orders_update on public.orders for update to authenticated using ((select private.current_role()) in ('admin','editor') and deleted_at is null) with check ((select private.current_role()) in ('admin','editor'));
create policy runs_admin on public.sync_runs for select to authenticated using ((select private.current_role())='admin');
create policy audit_admin on public.audit_logs for select to authenticated using ((select private.current_role())='admin');
create policy settings_read on public.workspace_settings for select to authenticated using ((select private.current_role()) is not null);
create policy settings_write on public.workspace_settings for update to authenticated using ((select private.current_role())='admin') with check ((select private.current_role())='admin');

create function private.stamp_order() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then new.created_at:=now(); end if;
 new.updated_at:=now(); new.updated_by:=auth.uid();
 if TG_OP='UPDATE' then new.id:=old.id; new.created_at:=old.created_at; end if;
 return new;
end $$;
create trigger orders_stamp before insert or update on public.orders for each row execute function private.stamp_order();
create function private.audit_mutation() returns trigger language plpgsql security definer set search_path='' as $$
declare old_data jsonb; new_data jsonb; resource text;
begin
 if TG_OP='UPDATE' then old_data:=to_jsonb(old); end if;
 new_data:=to_jsonb(new);
 -- Cast monetary values before JSON serialization to avoid loss in downstream JavaScript.
 if TG_TABLE_NAME='orders' then
   new_data:=new_data||jsonb_build_object('total_amount',new.total_amount::text);
   if TG_OP='UPDATE' then old_data:=old_data||jsonb_build_object('total_amount',old.total_amount::text); end if;
 end if;
 resource:=coalesce(new_data->>'id','settings');
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data)
 values(auth.uid(),case when TG_OP='INSERT' then 'created' when TG_TABLE_NAME='orders' and new_data->>'deleted_at' is not null then 'deleted' else 'updated' end,TG_TABLE_NAME,resource,old_data,new_data);
 return new;
end $$;
create trigger orders_audit after insert or update on public.orders for each row execute function private.audit_mutation();
create trigger profiles_audit after insert or update on public.profiles for each row execute function private.audit_mutation();
create trigger settings_audit after update on public.workspace_settings for each row execute function private.audit_mutation();

create view public.orders_api with (security_invoker=true) as
 select id,order_code,customer_name,order_date,status,total_amount::text as total_amount,note,created_at,updated_at,updated_by,deleted_at from public.orders;
revoke all on public.orders_api from anon,authenticated;
grant select on public.orders_api to authenticated,service_role;

create function private.manage_profile(target uuid, full_name_input text, email_input text, role_input text, active_input boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.current_role()<>'admin' then raise insufficient_privilege using message='Admin required'; end if;
 perform pg_advisory_xact_lock(763024);
 if target=auth.uid() then raise exception 'Cannot change your own access' using errcode='23514'; end if;
 if role_input not in ('admin','editor','viewer') then raise exception 'Invalid role' using errcode='23514'; end if;
 if exists(select 1 from public.profiles where id=target and role='admin' and is_active) and (role_input<>'admin' or not active_input)
 and (select count(*) from public.profiles where role='admin' and is_active)<=1 then raise exception 'Last active admin' using errcode='23514'; end if;
 insert into public.profiles(id,full_name,email,role,is_active) values(target,full_name_input,email_input,role_input,active_input)
 on conflict(id) do update set role=excluded.role,is_active=excluded.is_active,updated_at=now();
end $$;
revoke all on function private.manage_profile(uuid,text,text,text,boolean) from public,anon;
grant execute on function private.manage_profile(uuid,text,text,text,boolean) to authenticated;
create function public.manage_profile(target uuid,full_name_input text,email_input text,role_input text,active_input boolean) returns void
language sql security invoker set search_path='' as $$select private.manage_profile(target,full_name_input,email_input,role_input,active_input)$$;
revoke all on function public.manage_profile(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.manage_profile(uuid,text,text,text,boolean) to authenticated;

create function private.bootstrap_admin(target uuid,full_name_input text,email_input text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(763024);
 if exists(select 1 from public.profiles where role='admin' and is_active) then raise exception 'Admin already exists'; end if;
 insert into public.profiles(id,full_name,email,role,is_active) values(target,full_name_input,email_input,'admin',true);
end $$;
revoke all on function private.bootstrap_admin(uuid,text,text) from public,anon,authenticated;
grant execute on function private.bootstrap_admin(uuid,text,text) to service_role;
create function public.bootstrap_admin(target uuid,full_name_input text,email_input text) returns void language sql security invoker set search_path='' as $$select private.bootstrap_admin(target,full_name_input,email_input)$$;
revoke all on function public.bootstrap_admin(uuid,text,text) from public,anon,authenticated;
grant execute on function public.bootstrap_admin(uuid,text,text) to service_role;

create function public.analytics_summary(date_from date default null,date_to date default null,status_filter text default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 with filtered as (select * from public.orders where deleted_at is null and (date_from is null or order_date>=date_from) and (date_to is null or order_date<=date_to) and (status_filter is null or status=status_filter)),
 months as (select to_char(order_date,'YYYY-MM') as month,count(*) as count,coalesce(sum(total_amount) filter(where status='completed'),0)::text revenue from filtered group by 1 order by 1),
 states as (select s.status,count(f.id) value,coalesce(sum(f.total_amount),0)::text amount from unnest(array['pending','completed','cancelled']) s(status) left join filtered f on f.status=s.status group by s.status)
 select jsonb_build_object('total',count(*),'completed',count(*) filter(where status='completed'),'revenue',coalesce(sum(total_amount) filter(where status='completed'),0)::text,
 'rate',case when count(*)=0 then 0 else round(100.0*count(*) filter(where status='completed')/count(*),1) end,
 'monthly',coalesce((select jsonb_agg(to_jsonb(m)) from months m),'[]'::jsonb),
 'distribution',coalesce((select jsonb_agg(to_jsonb(s)) from states s),'[]'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,order_code,customer_name,order_date,status,total_amount::text,note,created_at,updated_at,updated_by,deleted_at from filtered order by order_date desc,created_at desc,id limit 10)r),'[]'::jsonb)) from filtered;
$$;
revoke all on function public.analytics_summary(date,date,text) from public,anon;
grant execute on function public.analytics_summary(date,date,text) to authenticated;

-- Revoke executable defaults on trigger helpers as well.
revoke all on function private.stamp_order(),private.audit_mutation() from public,anon,authenticated;

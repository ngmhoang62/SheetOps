-- Additive, backward-compatible visibility API. No rows or historical audit events are removed.
drop policy orders_read on public.orders;
create policy orders_read on public.orders for select to authenticated using ((select private.current_role()) in ('admin','editor','viewer'));
create function private.set_order_visibility(target uuid, hidden_input boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare current_deleted timestamptz;
begin
 if auth.uid() is null or private.current_role() is null or private.current_role() not in ('admin','editor') then raise insufficient_privilege; end if;
 if hidden_input is null then raise check_violation; end if;
 select deleted_at into current_deleted from public.orders where id=target for update;
 if not found then raise no_data_found; end if;
 if (current_deleted is not null)=hidden_input then return false; end if;
 update public.orders set deleted_at=case when hidden_input then now() else null end where id=target;
 return true;
end $$;
revoke all on function private.set_order_visibility(uuid,boolean) from public,anon;
grant execute on function private.set_order_visibility(uuid,boolean) to authenticated;
create function public.set_order_visibility(target uuid, hidden_input boolean) returns boolean language sql security invoker set search_path='' as $$ select private.set_order_visibility(target,hidden_input) $$;
revoke all on function public.set_order_visibility(uuid,boolean) from public,anon;
grant execute on function public.set_order_visibility(uuid,boolean) to authenticated;
create or replace function private.soft_delete_order(target uuid) returns void language plpgsql security definer set search_path='' as $$begin perform private.set_order_visibility(target,true); end $$;
create or replace function private.audit_mutation() returns trigger language plpgsql security definer set search_path='' as $$
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
 values(auth.uid(),case when TG_OP='INSERT' then 'created' when TG_TABLE_NAME='orders' and old_data->>'deleted_at' is null and new_data->>'deleted_at' is not null then 'hidden' when TG_TABLE_NAME='orders' and old_data->>'deleted_at' is not null and new_data->>'deleted_at' is null then 'restored' else 'updated' end,TG_TABLE_NAME,resource,old_data,new_data);
 return new;
end $$;

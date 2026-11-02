create or replace view public.orders_api with (security_invoker=true) as
 select id,order_code,customer_name,order_date,status,total_amount::text as total_amount,note,created_at,updated_at,updated_by,deleted_at,total_amount as amount_sort from public.orders;

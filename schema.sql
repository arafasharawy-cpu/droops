-- نسخة الإكسسوارات السحابية: الصق الملف كله في Supabase > SQL Editor ثم Run
create table profiles(id uuid primary key references auth.users on delete cascade, name text not null, role text not null default 'staff' check (role in ('owner','staff')));
create table products(id bigserial primary key, code text unique not null, name text not null, model text not null default '', price numeric not null default 0, qty int not null default 0 check (qty>=0), min_qty int not null default 0);
create table product_costs(product_id bigint primary key references products on delete cascade, cost numeric not null default 0);
create table sales(id bigserial primary key, kind text not null default 'sale', channel text not null, discount numeric not null default 0, total numeric not null, created_by uuid not null default auth.uid(), created_at timestamptz not null default now());
create table sale_items(id bigserial primary key, sale_id bigint references sales on delete cascade, product_id bigint, name text, qty int, price numeric);
create table sale_costs(sale_id bigint primary key references sales on delete cascade, cost numeric not null);
create table stock_moves(id bigserial primary key, product_id bigint references products on delete cascade, qty int not null, type text not null, created_by uuid default auth.uid(), created_at timestamptz not null default now());

create function is_owner() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='owner') $$;

-- أول حساب يتعمل = الأونر، وأي حساب بعده = موظف
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,name,role) values(new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    case when exists(select 1 from profiles) then 'staff' else 'owner' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

alter table profiles enable row level security; alter table products enable row level security; alter table product_costs enable row level security;
alter table sales enable row level security; alter table sale_items enable row level security; alter table sale_costs enable row level security; alter table stock_moves enable row level security;
create policy r on profiles for select to authenticated using (true);
create policy r on products for select to authenticated using (true);
create policy r on product_costs for select to authenticated using (is_owner());
create policy r on sales for select to authenticated using (is_owner() or created_by=auth.uid());
create policy r on sale_items for select to authenticated using (is_owner() or exists(select 1 from sales s where s.id=sale_id and s.created_by=auth.uid()));
create policy r on sale_costs for select to authenticated using (is_owner());
create policy r on stock_moves for select to authenticated using (true);
-- ممنوع أي كتابة مباشرة من التطبيق: كل التعديلات بتم من الدوال تحت بس
revoke insert,update,delete on all tables in schema public from anon, authenticated;
revoke select on all tables in schema public from anon;

create function add_product(p_code text,p_name text,p_model text,p_price numeric,p_qty int,p_min int,p_cost numeric) returns bigint language plpgsql security definer set search_path=public as $$
declare c text; pid bigint;
begin
  if auth.uid() is null then raise exception 'سجل الدخول أولاً'; end if;
  c:=nullif(trim(p_code),'');
  if c is null then select (coalesce(max(code::bigint),0)+1)::text into c from products where code ~ '^[0-9]{1,15}$'; end if;
  insert into products(code,name,model,price,qty,min_qty) values(c,p_name,coalesce(p_model,''),coalesce(p_price,0),greatest(coalesce(p_qty,0),0),coalesce(p_min,0)) returning id into pid;
  insert into product_costs values(pid, case when is_owner() then coalesce(p_cost,0) else 0 end);
  if coalesce(p_qty,0)>0 then insert into stock_moves(product_id,qty,type) values(pid,p_qty,'رصيد افتتاحي'); end if;
  return pid;
end $$;

create function make_sale(p_channel text,p_discount numeric,p_items jsonb) returns bigint language plpgsql security definer set search_path=public as $$
declare it jsonb; pid bigint; q int; pr numeric; nm text; cst numeric; raw numeric:=0; tc numeric:=0; sid bigint; disc numeric:=greatest(coalesce(p_discount,0),0);
begin
  if auth.uid() is null then raise exception 'سجل الدخول أولاً'; end if;
  if disc>0 and not is_owner() then raise exception 'الخصم للأونر فقط'; end if;
  insert into sales(channel,discount,total) values(p_channel,disc,0) returning id into sid;
  for it in select value from jsonb_array_elements(p_items) loop
    q:=(it->>'qty')::int; pid:=null;
    if q is null or q<=0 then raise exception 'كمية غير صحيحة'; end if;
    update products set qty=qty-q where code=it->>'code' and qty>=q returning id,name,price into pid,nm,pr;
    if pid is null then raise exception 'الكمية غير كافية أو المنتج غير موجود: %', it->>'code'; end if;
    select coalesce(cost,0) into cst from product_costs where product_id=pid;
    insert into sale_items(sale_id,product_id,name,qty,price) values(sid,pid,nm,q,pr);
    insert into stock_moves(product_id,qty,type) values(pid,-q,'بيع '||p_channel);
    raw:=raw+pr*q; tc:=tc+coalesce(cst,0)*q;
  end loop;
  if raw=0 then raise exception 'السلة فاضية'; end if;
  update sales set total=greatest(raw-disc,0) where id=sid;
  insert into sale_costs values(sid,tc);
  return sid;
end $$;

create function receive_stock(p_code text,p_qty int,p_cost numeric default null) returns void language plpgsql security definer set search_path=public as $$
declare pid bigint;
begin
  if not is_owner() then raise exception 'للأونر فقط'; end if;
  update products set qty=qty+p_qty where code=p_code and qty+p_qty>=0 returning id into pid;
  if pid is null then raise exception 'المنتج غير موجود أو الرصيد لا يكفي'; end if;
  if p_cost is not null and p_cost>0 then update product_costs set cost=p_cost where product_id=pid; end if;
  if p_qty<>0 then insert into stock_moves(product_id,qty,type) values(pid,p_qty,case when p_qty>0 then 'استلام' else 'تسوية' end); end if;
end $$;

create function return_product(p_code text,p_qty int) returns void language plpgsql security definer set search_path=public as $$
declare pid bigint; nm text; pr numeric; cst numeric; sid bigint;
begin
  if not is_owner() then raise exception 'المرتجع للأونر فقط'; end if;
  if p_qty is null or p_qty<=0 then raise exception 'كمية غير صحيحة'; end if;
  update products set qty=qty+p_qty where code=p_code returning id,name,price into pid,nm,pr;
  if pid is null then raise exception 'المنتج غير موجود'; end if;
  select coalesce(cost,0) into cst from product_costs where product_id=pid;
  insert into sales(kind,channel,total) values('return','مرتجع',-pr*p_qty) returning id into sid;
  insert into sale_items(sale_id,product_id,name,qty,price) values(sid,pid,nm,p_qty,pr);
  insert into sale_costs values(sid,-cst*p_qty);
  insert into stock_moves(product_id,qty,type) values(pid,p_qty,'مرتجع');
end $$;

create function delete_product(p_id bigint) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'للأونر فقط'; end if;
  delete from products where id=p_id;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function is_owner(), add_product(text,text,text,numeric,int,int,numeric), make_sale(text,numeric,jsonb), receive_stock(text,int,numeric), return_product(text,int), delete_product(bigint) to authenticated;

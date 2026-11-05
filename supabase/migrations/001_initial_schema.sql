-- XOLOTL TLAN: base de datos inicial
-- Ejecutar en Supabase > SQL Editor. No reutilizar el proyecto de CASA ODI.

create extension if not exists pgcrypto;

create type public.order_status as enum ('nuevo', 'en_preparacion', 'listo', 'entregado', 'cancelado');
create type public.staff_role as enum ('administrador', 'cocina', 'despacho', 'consulta');

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price_cop integer not null check (price_cop >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.staff_role not null default 'consulta',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null default 'Cliente mostrador',
  order_channel text not null default 'mostrador' check (order_channel in ('qr','mostrador')),
  table_label text,
  status public.order_status not null default 'nuevo',
  subtotal_cop integer not null check (subtotal_cop >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price_cop integer not null check (unit_price_cop >= 0),
  quantity integer not null check (quantity between 1 and 100),
  line_total_cop integer generated always as (unit_price_cop * quantity) stored
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(status);
create index order_items_order_id_idx on public.order_items(order_id);

create or replace function public.is_active_staff()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid() and is_active = true
  );
$$;

create or replace function public.has_staff_role(allowed public.staff_role[])
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid() and is_active = true and role = any(allowed)
  );
$$;

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy "Public can view active categories"
on public.menu_categories for select to anon, authenticated using (is_active = true);

create policy "Public can view available menu"
on public.menu_items for select to anon, authenticated using (
  is_available = true and exists (
    select 1 from public.menu_categories c
    where c.id = category_id and c.is_active = true
  )
);

create policy "Staff can view all categories"
on public.menu_categories for select to authenticated using (public.is_active_staff());
create policy "Admins manage categories"
on public.menu_categories for all to authenticated
using (public.has_staff_role(array['administrador']::public.staff_role[]))
with check (public.has_staff_role(array['administrador']::public.staff_role[]));

create policy "Staff can view menu items"
on public.menu_items for select to authenticated using (public.is_active_staff());
create policy "Admins manage menu items"
on public.menu_items for all to authenticated
using (public.has_staff_role(array['administrador']::public.staff_role[]))
with check (public.has_staff_role(array['administrador']::public.staff_role[]));

create policy "Staff can read own profile"
on public.staff_profiles for select to authenticated using (user_id = auth.uid() or public.has_staff_role(array['administrador']::public.staff_role[]));
create policy "Admins manage staff"
on public.staff_profiles for all to authenticated
using (public.has_staff_role(array['administrador']::public.staff_role[]))
with check (public.has_staff_role(array['administrador']::public.staff_role[]));

create policy "Staff can view orders"
on public.orders for select to authenticated using (public.is_active_staff());
create policy "Staff can update orders"
on public.orders for update to authenticated
using (public.has_staff_role(array['administrador','cocina','despacho']::public.staff_role[]))
with check (public.has_staff_role(array['administrador','cocina','despacho']::public.staff_role[]));

create policy "Staff can view order items"
on public.order_items for select to authenticated using (public.is_active_staff());
create policy "Staff can view order history"
on public.order_status_history for select to authenticated using (public.is_active_staff());

-- El cliente QR nunca puede enviar precios ni totales confiables: el servidor los calcula.
create or replace function public.submit_public_order(
  p_customer_name text,
  p_items jsonb,
  p_channel text default 'qr',
  p_table_label text default null,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal integer := 0;
  v_item jsonb;
  v_menu_item public.menu_items%rowtype;
  v_quantity integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe incluir al menos un producto';
  end if;
  if p_channel not in ('qr','mostrador') then
    raise exception 'Canal de pedido no válido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 100 then
      raise exception 'Cantidad no válida';
    end if;
    select * into v_menu_item from public.menu_items
      where id = (v_item->>'menu_item_id')::uuid and is_available = true;
    if not found then
      raise exception 'Uno de los productos ya no está disponible';
    end if;
    v_subtotal := v_subtotal + v_menu_item.price_cop * v_quantity;
  end loop;

  insert into public.orders(customer_name, order_channel, table_label, subtotal_cop, notes)
  values (coalesce(nullif(trim(p_customer_name),''),'Cliente mostrador'), p_channel, p_table_label, v_subtotal, coalesce(p_notes,''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_menu_item from public.menu_items
      where id = (v_item->>'menu_item_id')::uuid and is_available = true;
    insert into public.order_items(order_id, menu_item_id, item_name, unit_price_cop, quantity)
    values (v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.price_cop, v_quantity);
  end loop;

  insert into public.order_status_history(order_id, new_status)
  values (v_order_id, 'nuevo');
  return v_order_id;
end;
$$;

revoke all on function public.submit_public_order(text,jsonb,text,text,text) from public;
grant execute on function public.submit_public_order(text,jsonb,text,text,text) to anon, authenticated;

grant select on public.menu_categories, public.menu_items to anon, authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items, public.order_status_history to authenticated;
grant select on public.staff_profiles to authenticated;
grant insert, update, delete on public.menu_categories, public.menu_items, public.staff_profiles to authenticated;

-- Datos iniciales de menú: precios iniciales COP, editables luego desde administración.
insert into public.menu_categories(name, sort_order) values ('Guisos', 1), ('Bebidas', 2)
on conflict (name) do nothing;

insert into public.menu_items(category_id, name, description, price_cop, sort_order)
select c.id, v.name, v.description, v.price, v.sort_order
from public.menu_categories c
cross join (values
 ('Chícharo en salsa verde','Guiso casero, suave y lleno de sabor.',7000,1),
 ('Chícharo en salsa roja','Receta tradicional con salsa de la casa.',7000,2),
 ('Huevo','Huevo guisado al estilo de la casa.',7000,3),
 ('Picadillo','Carne molida con verduras y sazón casera.',7000,4),
 ('Papas con chorizo','Papas doraditas con chorizo.',7000,5)
) as v(name,description,price,sort_order)
where c.name = 'Guisos' and not exists (
 select 1 from public.menu_items m where m.name = v.name
);

insert into public.menu_items(category_id, name, description, price_cop, sort_order)
select c.id, v.name, v.description, v.price, v.sort_order
from public.menu_categories c
cross join (values
 ('Agua de horchata','Agua fresca preparada en casa.',5000,1),
 ('Agua de jamaica','Agua fresca de jamaica natural.',5000,2)
) as v(name,description,price,sort_order)
where c.name = 'Bebidas' and not exists (
 select 1 from public.menu_items m where m.name = v.name
);

-- Habilitar Realtime para que cocina reciba pedidos nuevos y cambios de estado.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

-- Registrar automáticamente el historial cuando el personal cambia el estado.
create or replace function public.log_order_status_change()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_status_history_trigger on public.orders;
create trigger orders_status_history_trigger
before update of status on public.orders
for each row execute function public.log_order_status_change();

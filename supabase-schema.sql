-- Food Flow database schema. Run this once in Supabase Dashboard > SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  price integer not null check (price > 0),
  category text not null check (category in ('rice', 'pizza', 'snacks')),
  image_url text not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  address text not null,
  payment_method text not null check (payment_method in ('Cash on Delivery', 'UPI')),
  total_amount integer not null check (total_amount > 0),
  status text not null default 'Order Placed' check (status in ('Order Placed', 'Preparing', 'Out for Delivery', 'Delivered')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_name text not null,
  unit_price integer not null check (unit_price > 0),
  quantity integer not null check (quantity > 0)
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.food_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Public can view available food" on public.food_items;
create policy "Public can view available food" on public.food_items for select to anon, authenticated using (is_available = true or (select public.is_admin()));
drop policy if exists "Admins manage food" on public.food_items;
create policy "Admins manage food" on public.food_items for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Customers view their own orders" on public.orders;
create policy "Customers view their own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "Customers create their own orders" on public.orders;
create policy "Customers create their own orders" on public.orders for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Users see allowed order items" on public.order_items;
create policy "Users see allowed order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_id and (orders.user_id = (select auth.uid()) or (select public.is_admin()))));
drop policy if exists "Customers create items for own orders" on public.order_items;
create policy "Customers create items for own orders" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders where orders.id = order_id and orders.user_id = (select auth.uid())));

insert into public.food_items (name, price, category, image_url) values
  ('Chicken Biryani', 220, 'rice', 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=600&q=80'),
  ('Veg Fried Rice', 150, 'rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80'),
  ('Paneer Pizza', 280, 'pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80'),
  ('French Fries', 120, 'snacks', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'),
  ('Veg Burger', 160, 'snacks', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'),
  ('Margherita Pizza', 240, 'pizza', 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80')
on conflict do nothing;

-- After creating your own account, make it admin with this one-time command:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';

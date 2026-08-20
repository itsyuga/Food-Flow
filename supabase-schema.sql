-- ====================================================================
-- FoodFlow Database Schema & Migration Script
-- Run this in Supabase Dashboard > SQL Editor
-- This script is fully idempotent and backward-compatible.
-- ====================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE (Customers & Admins)
-- --------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Backward-compatible column additions
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;

-- --------------------------------------------------------------------
-- 2. FOOD ITEMS TABLE
-- --------------------------------------------------------------------
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  price integer not null check (price > 0),
  category text not null,
  image_url text not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- Backward-compatible column additions
alter table public.food_items add column if not exists description text default '';
alter table public.food_items add column if not exists is_veg boolean not null default true;
alter table public.food_items add column if not exists rating numeric(2,1) not null default 4.5;

-- Safely loosen / expand category constraint if it was restricted
alter table public.food_items drop constraint if exists food_items_category_check;
alter table public.food_items add constraint food_items_category_check 
  check (category in ('rice', 'pizza', 'snacks', 'burger', 'beverages', 'desserts', 'breakfast', 'lunch', 'dinner'));

-- --------------------------------------------------------------------
-- 3. ORDERS TABLE
-- --------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  address text not null,
  payment_method text not null,
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'Order Placed',
  created_at timestamptz not null default now()
);

-- Backward-compatible column additions
alter table public.orders add column if not exists subtotal integer not null default 0;
alter table public.orders add column if not exists delivery_fee integer not null default 0;

-- Loosen and update payment_method constraint
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check 
  check (payment_method in ('Cash on Delivery', 'UPI', 'Mock UPI', 'Card'));

-- Expand status lifecycle check constraint
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check 
  check (status in ('Pending', 'Order Placed', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'));

-- --------------------------------------------------------------------
-- 4. ORDER ITEMS TABLE
-- --------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_name text not null,
  unit_price integer not null check (unit_price > 0),
  quantity integer not null check (quantity > 0)
);

-- --------------------------------------------------------------------
-- 5. FAVORITES TABLE (Persistent User Wishlist)
-- --------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.food_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, food_id)
);

-- --------------------------------------------------------------------
-- 6. INDEXES FOR PERFORMANCE
-- --------------------------------------------------------------------
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists food_items_category_idx on public.food_items(category);

-- --------------------------------------------------------------------
-- 7. AUTH TRIGGER (Auto-create Profile upon Signup)
-- --------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    address = coalesce(nullif(excluded.address, ''), public.profiles.address);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------------------
-- 8. SECURITY HELPER (is_admin)
-- --------------------------------------------------------------------
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

-- --------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.food_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.favorites enable row level security;

-- PROFILES Policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users and admins view profiles" on public.profiles;
create policy "Users and admins view profiles" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.is_admin()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- FOOD_ITEMS Policies
drop policy if exists "Public can view available food" on public.food_items;
create policy "Public can view available food" on public.food_items
  for select to anon, authenticated
  using (is_available = true or (select public.is_admin()));

drop policy if exists "Admins manage food" on public.food_items;
create policy "Admins manage food" on public.food_items
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ORDERS Policies
drop policy if exists "Customers view their own orders" on public.orders;
create policy "Customers view their own orders" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Customers create their own orders" on public.orders;
create policy "Customers create their own orders" on public.orders
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ORDER_ITEMS Policies
drop policy if exists "Users see allowed order items" on public.order_items;
create policy "Users see allowed order items" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders 
    where orders.id = order_items.order_id 
    and (orders.user_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy if exists "Customers create items for own orders" on public.order_items;
create policy "Customers create items for own orders" on public.order_items
  for insert to authenticated
  with check (exists (
    select 1 from public.orders 
    where orders.id = order_items.order_id 
    and orders.user_id = (select auth.uid())
  ));

-- FAVORITES Policies
drop policy if exists "Users view their own favorites" on public.favorites;
create policy "Users view their own favorites" on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users add their own favorites" on public.favorites;
create policy "Users add their own favorites" on public.favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users delete their own favorites" on public.favorites;
create policy "Users delete their own favorites" on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- --------------------------------------------------------------------
-- 10. EXPANDED SEED DATA
-- --------------------------------------------------------------------
insert into public.food_items (name, description, price, category, image_url, is_veg, rating) values
  ('Royal Chicken Biryani', 'Aromatic basmati rice cooked with tender spiced chicken, saffron, and caramelised onions served with raita.', 240, 'rice', 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=600&q=80', false, 4.8),
  ('Hyderabadi Veg Biryani', 'Fragrant basmati rice layered with fresh seasonal vegetables, paneer cubes, mint, and whole spices.', 180, 'rice', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', true, 4.6),
  ('Paneer Tikka Pizza', 'Hand-stretched dough topped with smoky tandoori paneer, crisp bell peppers, red onions, and melted mozzarella.', 280, 'pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80', true, 4.7),
  ('Classic Margherita Pizza', 'Rich San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil leaves, and extra virgin olive oil.', 230, 'pizza', 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80', true, 4.5),
  ('Crispy Veg Burger', 'Golden spiced potato & corn patty with crisp lettuce, pickled gherkins, sliced tomatoes, and house herb mayo.', 140, 'burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', true, 4.4),
  ('Grilled BBQ Chicken Burger', 'Juicy flame-grilled chicken breast glazed with smoky BBQ sauce, aged cheddar cheese, and fresh coleslaw.', 210, 'burger', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80', false, 4.7),
  ('Loaded Peri Peri Fries', 'Golden crispy skin-on potato fries dusted with tangy African peri-peri spices and served with cheese dip.', 120, 'snacks', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', true, 4.6),
  ('Crispy Paneer Fingers', 'Cumin and herb-crusted cottage cheese batons deep-fried to golden perfection with mint chutney.', 160, 'snacks', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80', true, 4.5),
  ('Fresh Mango Lassi', 'Thick creamy churned yogurt blended with sweet Alphonso mango pulp and a pinch of green cardamom.', 90, 'beverages', 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80', true, 4.8),
  ('Cold Brew Iced Coffee', 'Slow-steeped artisan dark roast coffee served chilled over ice with a swirl of sweetened condensed milk.', 110, 'beverages', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80', true, 4.6),
  ('Belgian Chocolate Brownie', 'Warm fudgy dark chocolate brownie packed with toasted walnuts and drizzled with Belgian chocolate ganache.', 130, 'desserts', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', true, 4.9),
  ('Saffron Gulab Jamun (2 pcs)', 'Melt-in-mouth milk dumplings simmered in fragrant saffron-rose sugar syrup.', 80, 'desserts', 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?auto=format&fit=crop&w=600&q=80', true, 4.7)
on conflict do nothing;

-- --------------------------------------------------------------------
-- 11. HOW TO ASSIGN AN ADMIN:
-- update public.profiles set role = 'admin' where id = 'YOUR_USER_UUID';
-- --------------------------------------------------------------------

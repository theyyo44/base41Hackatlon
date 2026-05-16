-- MedAsistan - Supabase Schema

-- Profiller (Supabase auth üzerine ek bilgiler)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  phone text,
  emergency_contact text,
  created_at timestamp default now()
);

-- İlaçlar (envanter)
create table medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  active_ingredient text,
  dosage text,
  expiry_date date,
  quantity integer default 1,
  image_url text,
  is_active boolean default false,
  created_at timestamp default now()
);

-- Kullanım planı
create table schedules (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid references medicines on delete cascade not null,
  user_id uuid references auth.users not null,
  times time[] not null,
  start_date date not null,
  end_date date,
  notes text,
  created_at timestamp default now()
);

-- Doz kayitlari
create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules on delete cascade not null,
  user_id uuid references auth.users not null,
  dose_date date not null,
  dose_time time not null,
  is_taken boolean default false,
  taken_at timestamp,
  created_at timestamp default now()
);

-- Bildirimler (log)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null,
  title text not null,
  message text,
  is_read boolean default false,
  created_at timestamp default now()
);

-- RLS politikaları
alter table profiles enable row level security;
alter table medicines enable row level security;
alter table schedules enable row level security;
alter table dose_logs enable row level security;
alter table notifications enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can view own medicines" on medicines for select using (auth.uid() = user_id);
create policy "Users can insert own medicines" on medicines for insert with check (auth.uid() = user_id);
create policy "Users can update own medicines" on medicines for update using (auth.uid() = user_id);
create policy "Users can delete own medicines" on medicines for delete using (auth.uid() = user_id);

create policy "Users can view own schedules" on schedules for select using (auth.uid() = user_id);
create policy "Users can insert own schedules" on schedules for insert with check (auth.uid() = user_id);
create policy "Users can update own schedules" on schedules for update using (auth.uid() = user_id);
create policy "Users can delete own schedules" on schedules for delete using (auth.uid() = user_id);

create policy "Users can view own dose logs" on dose_logs for select using (auth.uid() = user_id);
create policy "Users can insert own dose logs" on dose_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own dose logs" on dose_logs for update using (auth.uid() = user_id);
create policy "Users can delete own dose logs" on dose_logs for delete using (auth.uid() = user_id);

create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);
create policy "Users can insert own notifications" on notifications for insert with check (auth.uid() = user_id);

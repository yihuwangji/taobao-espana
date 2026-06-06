create table if not exists public.platform_coin_transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  type text not null check (type in ('share_reward', 'admin_adjustment', 'gift_redeem')),
  source_type text,
  source_id text,
  unique_key text unique,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_coin_transactions_user_created_idx
  on public.platform_coin_transactions (user_id, created_at desc);

create index if not exists platform_coin_transactions_user_type_created_idx
  on public.platform_coin_transactions (user_id, type, created_at desc);

create table if not exists public.platform_rewards (
  id text primary key,
  title text not null,
  description text not null default '',
  coin_cost integer not null check (coin_cost > 0),
  stock integer,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_reward_redemptions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null references public.platform_rewards(id),
  coin_cost integer not null check (coin_cost > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'fulfilled')),
  contact_name text,
  contact_phone text,
  note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_reward_redemptions_user_created_idx
  on public.platform_reward_redemptions (user_id, created_at desc);

create or replace function public.platform_rewards_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_rewards_touch_updated_at on public.platform_rewards;
create trigger platform_rewards_touch_updated_at
before update on public.platform_rewards
for each row execute function public.platform_rewards_touch_updated_at();

drop trigger if exists platform_reward_redemptions_touch_updated_at on public.platform_reward_redemptions;
create trigger platform_reward_redemptions_touch_updated_at
before update on public.platform_reward_redemptions
for each row execute function public.platform_rewards_touch_updated_at();

insert into public.platform_rewards (id, title, description, coin_cost, stock, sort_order)
values
  ('priority_review', '信息优先处理券', '兑换后联系客服，人工优先处理一次信息修改、审核或咨询。', 30, null, 10),
  ('top_trial', '信息置顶体验券', '兑换后可申请一条已审核信息获得短期额外曝光，具体位置由客服安排。', 120, null, 20),
  ('small_gift', '西班牙生活通小礼物', '可兑换平台准备的小礼物或合作商家礼品，库存和领取方式以客服确认为准。', 200, 100, 30)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    coin_cost = excluded.coin_cost,
    stock = excluded.stock,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

alter table public.platform_coin_transactions enable row level security;
alter table public.platform_rewards enable row level security;
alter table public.platform_reward_redemptions enable row level security;

revoke all on public.platform_coin_transactions from anon, authenticated;
revoke all on public.platform_rewards from anon, authenticated;
revoke all on public.platform_reward_redemptions from anon, authenticated;

grant select, insert, update, delete on public.platform_coin_transactions to service_role;
grant select, insert, update, delete on public.platform_rewards to service_role;
grant select, insert, update, delete on public.platform_reward_redemptions to service_role;

grant usage, select on sequence public.platform_coin_transactions_id_seq to service_role;
grant usage, select on sequence public.platform_reward_redemptions_id_seq to service_role;

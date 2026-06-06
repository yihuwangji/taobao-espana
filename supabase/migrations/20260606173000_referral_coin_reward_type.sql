alter table public.platform_coin_transactions
  drop constraint if exists platform_coin_transactions_type_check;

alter table public.platform_coin_transactions
  add constraint platform_coin_transactions_type_check
  check (type in ('share_reward', 'referral_reward', 'admin_adjustment', 'gift_redeem'));

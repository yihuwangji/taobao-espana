alter table public.listings
  add column if not exists address text;

comment on column public.listings.address is
  'Optional merchant address used to build map links for business/service listings.';

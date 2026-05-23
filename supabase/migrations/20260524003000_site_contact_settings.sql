create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

grant select
  on public.site_settings
  to anon, authenticated;

grant select, insert, update, delete
  on public.site_settings
  to service_role;

alter table public.site_settings
  enable row level security;

drop policy if exists "public can read public site settings" on public.site_settings;
create policy "public can read public site settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (key in ('contact_info'));

insert into public.site_settings (key, value)
values (
  'contact_info',
  jsonb_build_object(
    'officialAccount', '西班牙生活通',
    'wechatId', 'espana_life',
    'email', 'aladaya@gmail.com',
    'supportHours', '9:00-22:00',
    'groupZh', '加入西班牙华人生活交流群，与更多华人朋友互动',
    'groupEs', 'Únete a la comunidad china en España para compartir información útil',
    'introZh', '感谢您使用西班牙生活通！如有任何问题或建议，请通过以下方式联系我们：',
    'introEs', 'Gracias por usar España Life. Si tienes alguna pregunta o sugerencia, puedes contactar con nosotros por estos medios:',
    'responseZh', '我们通常在24小时内回复您的咨询',
    'responseEs', 'Normalmente respondemos en un plazo de 24 horas'
  )
)
on conflict (key) do nothing;

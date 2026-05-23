update public.site_settings
set value = value
  || jsonb_build_object(
    'wechatGroup', coalesce(value->>'wechatGroup', '西班牙华人生活交流群'),
    'whatsapp', coalesce(value->>'whatsapp', '+34 '),
    'facebookName', coalesce(value->>'facebookName', 'España Life'),
    'facebookUrl', coalesce(value->>'facebookUrl', '')
  ),
  updated_at = now()
where key = 'contact_info';

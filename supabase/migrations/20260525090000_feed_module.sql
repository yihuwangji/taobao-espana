create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  description text not null,
  city text not null,
  whatsapp text not null,
  category text not null check (category in ('货源动态', '新品到仓', '清仓特价', '华人吐槽', '生意经验', '招工信息', '店铺转让')),
  tags text[] not null default '{}',
  is_anonymous boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'blocked')),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds <= 30),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.feed_saves (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_anonymous boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_status_created_idx on public.feed_posts(status, created_at desc);
create index if not exists feed_posts_category_created_idx on public.feed_posts(category, created_at desc);
create index if not exists feed_posts_city_idx on public.feed_posts(city);
create index if not exists feed_posts_tags_idx on public.feed_posts using gin(tags);
create index if not exists feed_media_post_idx on public.feed_media(post_id, sort_order);
create index if not exists feed_comments_post_idx on public.feed_comments(post_id, created_at desc);

create or replace function public.feed_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feed_posts_touch_updated_at on public.feed_posts;
create trigger feed_posts_touch_updated_at
before update on public.feed_posts
for each row execute function public.feed_touch_updated_at();

drop trigger if exists feed_comments_touch_updated_at on public.feed_comments;
create trigger feed_comments_touch_updated_at
before update on public.feed_comments
for each row execute function public.feed_touch_updated_at();

create or replace function private.feed_adjust_post_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post uuid;
  counter_name text;
  delta integer;
begin
  target_post = coalesce(new.post_id, old.post_id);
  delta = case when tg_op = 'INSERT' then 1 else -1 end;
  counter_name = case tg_table_name
    when 'feed_likes' then 'like_count'
    when 'feed_saves' then 'save_count'
    when 'feed_comments' then 'comment_count'
  end;

  if counter_name is not null then
    execute format(
      'update public.feed_posts set %I = greatest(0, %I + $1), updated_at = now() where id = $2',
      counter_name,
      counter_name
    ) using delta, target_post;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists feed_likes_counter_insert on public.feed_likes;
create trigger feed_likes_counter_insert
after insert on public.feed_likes
for each row execute function private.feed_adjust_post_counter();

drop trigger if exists feed_likes_counter_delete on public.feed_likes;
create trigger feed_likes_counter_delete
after delete on public.feed_likes
for each row execute function private.feed_adjust_post_counter();

drop trigger if exists feed_saves_counter_insert on public.feed_saves;
create trigger feed_saves_counter_insert
after insert on public.feed_saves
for each row execute function private.feed_adjust_post_counter();

drop trigger if exists feed_saves_counter_delete on public.feed_saves;
create trigger feed_saves_counter_delete
after delete on public.feed_saves
for each row execute function private.feed_adjust_post_counter();

drop trigger if exists feed_comments_counter_insert on public.feed_comments;
create trigger feed_comments_counter_insert
after insert on public.feed_comments
for each row execute function private.feed_adjust_post_counter();

drop trigger if exists feed_comments_counter_delete on public.feed_comments;
create trigger feed_comments_counter_delete
after delete on public.feed_comments
for each row execute function private.feed_adjust_post_counter();

alter table public.feed_posts enable row level security;
alter table public.feed_media enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_saves enable row level security;
alter table public.feed_comments enable row level security;

grant select on public.feed_posts, public.feed_media, public.feed_comments to anon, authenticated;
grant insert, update on public.feed_posts to authenticated;
grant insert on public.feed_media, public.feed_comments, public.feed_likes, public.feed_saves to authenticated;
grant delete on public.feed_likes, public.feed_saves to authenticated;
grant select on public.feed_likes, public.feed_saves to authenticated;

create policy "feed_posts_public_read_approved"
  on public.feed_posts for select
  using (status = 'approved' or auth.uid() = user_id);

create policy "feed_posts_insert_own"
  on public.feed_posts for insert
  with check (auth.uid() = user_id);

create policy "feed_posts_update_own_pending"
  on public.feed_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "feed_media_public_read"
  on public.feed_media for select
  using (exists (
    select 1 from public.feed_posts p
    where p.id = feed_media.post_id
      and (p.status = 'approved' or p.user_id = auth.uid())
  ));

create policy "feed_media_insert_own_post"
  on public.feed_media for insert
  with check (exists (
    select 1 from public.feed_posts p
    where p.id = feed_media.post_id and p.user_id = auth.uid()
  ));

create policy "feed_likes_read_own"
  on public.feed_likes for select
  using (auth.uid() = user_id);

create policy "feed_likes_insert_own"
  on public.feed_likes for insert
  with check (auth.uid() = user_id);

create policy "feed_likes_delete_own"
  on public.feed_likes for delete
  using (auth.uid() = user_id);

create policy "feed_saves_read_own"
  on public.feed_saves for select
  using (auth.uid() = user_id);

create policy "feed_saves_insert_own"
  on public.feed_saves for insert
  with check (auth.uid() = user_id);

create policy "feed_saves_delete_own"
  on public.feed_saves for delete
  using (auth.uid() = user_id);

create policy "feed_comments_public_read_approved"
  on public.feed_comments for select
  using (status = 'approved' or auth.uid() = user_id);

create policy "feed_comments_insert_own"
  on public.feed_comments for insert
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-media',
  'feed-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "feed_media_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'feed-media');

create policy "feed_media_storage_insert_auth"
  on storage.objects for insert
  with check (bucket_id = 'feed-media' and auth.role() = 'authenticated');

alter table public.feed_posts
  drop constraint if exists feed_posts_category_check;

alter table public.feed_posts
  add constraint feed_posts_category_check
  check (
    category in (
      '货源',
      '招工',
      '租房',
      '二手',
      '吐槽',
      '商家',
      '生活',
      '货源动态',
      '新品到仓',
      '清仓特价',
      '华人吐槽',
      '生意经验',
      '招工信息',
      '店铺转让'
    )
  );

comment on constraint feed_posts_category_check on public.feed_posts
  is 'Allowed categories for Ouquan feed posts, including current app labels and legacy labels.';

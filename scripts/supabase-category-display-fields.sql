alter table categories
  add column if not exists banner_image_url text,
  add column if not exists thumbnail_image_url text,
  add column if not exists icon_emoji text,
  add column if not exists description text,
  add column if not exists bg_image_url text,
  add column if not exists accent_color text,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_visible boolean not null default true;

update categories
set
  display_order = coalesce(display_order, id),
  is_visible = coalesce(is_visible, true);

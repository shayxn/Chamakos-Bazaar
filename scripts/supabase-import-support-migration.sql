create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table categories
  add column if not exists banner_image_url text,
  add column if not exists thumbnail_image_url text,
  add column if not exists icon_emoji text,
  add column if not exists description text,
  add column if not exists bg_image_url text,
  add column if not exists accent_color text,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_visible boolean not null default true;

alter table products
  add column if not exists image_urls text,
  add column if not exists colors text,
  add column if not exists is_pre_order boolean not null default false,
  add column if not exists pre_order_label text,
  add column if not exists pre_order_date text,
  add column if not exists pre_order_note text,
  add column if not exists supplier_price numeric(10, 2),
  add column if not exists import_source text,
  add column if not exists external_id text,
  add column if not exists selling_fast boolean not null default false,
  add column if not exists spotlight boolean not null default false,
  add column if not exists hidden boolean not null default false,
  add column if not exists publish_at timestamptz,
  add column if not exists unpublish_at timestamptz;

update categories
set
  display_order = case when display_order = 0 then id else display_order end,
  is_visible = coalesce(is_visible, true);

insert into categories (name, slug, display_order, is_visible)
values ('Clothing', 'clothing', 8, true)
on conflict (slug) do update set
  name = excluded.name,
  is_visible = true;

create index if not exists products_import_source_idx
  on products (import_source);

create index if not exists products_import_source_external_id_idx
  on products (import_source, external_id);

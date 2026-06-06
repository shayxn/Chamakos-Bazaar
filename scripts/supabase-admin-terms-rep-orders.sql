alter table products
  add column if not exists rep boolean not null default false;

create table if not exists content_pages (
  id serial primary key,
  slug text not null unique,
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

insert into content_pages (slug, title, content)
values (
  'terms',
  'Terms of Policy',
  'Welcome to Chamak Street. By placing an order on our store, you agree to the following Terms of Policy.

## 1. Order Agreement
By purchasing from Chamak Street, you confirm that you have read and agreed to all policies, terms, and conditions listed below.

## 2. Shipping & Delivery
Delivery times may vary depending on location, product availability, holidays, weather conditions, or courier delays. Some orders may arrive later than expected.

By placing an order, you understand and accept that:
- Orders may be delayed
- Shipping times are estimates only
- Chamak Street is not responsible for unexpected courier or transit delays

## 3. No Refund Policy
All sales are final.

Once an order has been placed:
- No refunds are allowed
- No cancellations are allowed
- No chargebacks should be attempted after purchase

Please make sure all information, sizes, colors, and products are correct before checking out.

## 4. Incorrect Information
Customers are responsible for entering the correct name, address, phone number, and delivery details. Chamak Street is not responsible for failed deliveries caused by incorrect customer information.

## 5. Product Availability
Some products may have limited stock. We reserve the right to cancel or limit orders if items become unavailable.

## 6. Changes to Policy
Chamak Street may update or change these policies at any time without prior notice.

By ordering from Chamak Street, you automatically agree to all Terms of Policy listed above.'
)
on conflict (slug) do nothing;

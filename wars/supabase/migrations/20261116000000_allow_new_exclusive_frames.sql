-- Keep the database frame allowlists and store pricing in sync with the catalog.
-- Exclusive frames cost ₹150, so prices cannot be restricted to ₹100 multiples.
alter table public.profile_frame_orders
  drop constraint if exists profile_frame_orders_price_inr_check;
alter table public.profile_frame_orders
  add constraint profile_frame_orders_price_inr_check
  check (price_inr >= 100);

-- These two frames were also added after the previous allowlist migration.
alter table public.profile_frame_orders
  drop constraint if exists profile_frame_orders_frame_id_check;
alter table public.profile_frame_orders
  add constraint profile_frame_orders_frame_id_check
  check (frame_id in (
    'crunching-fang',
    'thunder-sparking',
    'water-splash',
    'fire-blast',
    'level-100-wings',
    'sukuna-frame',
    'gojo-frame',
    'asta-frame',
    'yoriichi-frame',
    'subaru-frame',
    'luffy-gear-5-frame',
    'shadow-cat-ears'
  ));

alter table public.user_profile_frames
  drop constraint if exists user_profile_frames_frame_id_check;
alter table public.user_profile_frames
  add constraint user_profile_frames_frame_id_check
  check (frame_id in (
    'crunching-fang',
    'thunder-sparking',
    'water-splash',
    'fire-blast',
    'level-100-wings',
    'sukuna-frame',
    'gojo-frame',
    'asta-frame',
    'yoriichi-frame',
    'subaru-frame',
    'luffy-gear-5-frame',
    'shadow-cat-ears'
  ));

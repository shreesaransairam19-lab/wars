alter table public.profile_frame_orders
  drop constraint if exists profile_frame_orders_frame_id_check;
alter table public.profile_frame_orders
  add constraint profile_frame_orders_frame_id_check
  check (frame_id in (
    'crunching-fang',
    'thunder-sparking',
    'water-splash',
    'fire-blast',
    'level-100-wings'
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
    'level-100-wings'
  ));

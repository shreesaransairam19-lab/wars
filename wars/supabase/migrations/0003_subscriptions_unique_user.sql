-- One subscription row per user (required for upsert on user_id)
alter table public.subscriptions
  add constraint subscriptions_user_id_key unique (user_id);

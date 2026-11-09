-- Profile frame store: direct UPI order tracking, owned frames, and equipped frame.
create table public.profile_frame_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  frame_id text not null check (frame_id in ('crunching-fang')),
  price_inr integer not null check (price_inr >= 100 and price_inr % 100 = 0),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'submitted', 'approved', 'rejected', 'cancelled')),
  payment_reference text,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  check (status in ('awaiting_payment', 'cancelled') or payment_reference is not null)
);

create unique index profile_frame_orders_payment_reference_unique
  on public.profile_frame_orders (lower(payment_reference))
  where payment_reference is not null;

create unique index profile_frame_orders_one_active_frame
  on public.profile_frame_orders (user_id, frame_id)
  where status in ('awaiting_payment', 'submitted', 'approved');

create index profile_frame_orders_status_created
  on public.profile_frame_orders (status, created_at desc);

create table public.user_profile_frames (
  user_id uuid not null references public.profiles(id) on delete cascade,
  frame_id text not null check (frame_id in ('crunching-fang')),
  purchased_at timestamptz not null default now(),
  primary key (user_id, frame_id)
);

create table public.profile_frame_equipped (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  frame_id text not null,
  equipped_at timestamptz not null default now(),
  constraint profile_frame_equipped_owned_frame
    foreign key (user_id, frame_id)
    references public.user_profile_frames(user_id, frame_id)
    on delete cascade
);

alter table public.profile_frame_orders enable row level security;
alter table public.user_profile_frames enable row level security;
alter table public.profile_frame_equipped enable row level security;

create policy "Frame orders: own read"
  on public.profile_frame_orders for select to authenticated
  using (auth.uid() = user_id);

create policy "Owned profile frames: own read"
  on public.user_profile_frames for select to authenticated
  using (auth.uid() = user_id);

create policy "Equipped profile frames: public read"
  on public.profile_frame_equipped for select to anon, authenticated
  using (true);

create policy "Equipped profile frames: own insert"
  on public.profile_frame_equipped for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.user_profile_frames owned
      where owned.user_id = profile_frame_equipped.user_id
        and owned.frame_id = profile_frame_equipped.frame_id
    )
  );

create policy "Equipped profile frames: own update"
  on public.profile_frame_equipped for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.user_profile_frames owned
      where owned.user_id = profile_frame_equipped.user_id
        and owned.frame_id = profile_frame_equipped.frame_id
    )
  );

alter table public.xp_ledger drop constraint if exists xp_ledger_reason_check;
alter table public.xp_ledger add constraint xp_ledger_reason_check
  check (reason in ('read_chapter', 'send_message', 'review_posted', 'reaction_received', 'store_purchase'));

create or replace function public.review_profile_frame_order(
  p_order_id uuid,
  p_reviewer_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.profile_frame_orders%rowtype;
  ledger_other_xp bigint;
  recorded_read_xp bigint;
  completed_chapters bigint;
  total_xp bigint;
  current_level integer;
  target_level integer;
  award_xp integer := 0;
  levels_earned integer;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid review action';
  end if;

  if not exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_reviewer_id and r.name in ('owner', 'admin')
  ) then
    raise exception 'Owner or Admin role required';
  end if;

  select * into order_row
  from public.profile_frame_orders
  where id = p_order_id
  for update;

  if not found or order_row.status <> 'submitted' then
    raise exception 'This order is no longer awaiting review';
  end if;

  if p_action = 'reject' then
    update public.profile_frame_orders
      set status = 'rejected', reviewed_at = now(), reviewed_by = p_reviewer_id
      where id = p_order_id;
    return jsonb_build_object('success', true, 'status', 'rejected', 'xp_awarded', 0);
  end if;

  if exists (
    select 1 from public.user_profile_frames
    where user_id = order_row.user_id and frame_id = order_row.frame_id
  ) then
    raise exception 'This member already owns the selected frame';
  end if;

  insert into public.user_profile_frames (user_id, frame_id)
    values (order_row.user_id, order_row.frame_id);

  insert into public.profile_frame_equipped (user_id, frame_id, equipped_at)
    values (order_row.user_id, order_row.frame_id, now())
    on conflict (user_id) do update
      set frame_id = excluded.frame_id, equipped_at = excluded.equipped_at;

  select
    coalesce(sum(amount) filter (where reason <> 'read_chapter'), 0),
    coalesce(sum(amount) filter (where reason = 'read_chapter'), 0)
    into ledger_other_xp, recorded_read_xp
  from public.xp_ledger
  where user_id = order_row.user_id;

  select count(*) into completed_chapters
  from public.reading_progress
  where user_id = order_row.user_id and completed = true;

  total_xp := ledger_other_xp + greatest(recorded_read_xp, completed_chapters * 10);
  current_level := least(100, floor((1 + sqrt(1 + (8.0 * total_xp / 100))) / 2)::integer);
  levels_earned := floor(order_row.price_inr / 100.0)::integer;
  target_level := least(100, current_level + levels_earned);
  award_xp := greatest(0, ((target_level - 1) * target_level * 100 / 2) - total_xp)::integer;

  if award_xp > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_id)
      values (order_row.user_id, award_xp, 'store_purchase', order_row.id);
  end if;

  update public.profile_frame_orders
    set status = 'approved', reviewed_at = now(), reviewed_by = p_reviewer_id,
        xp_awarded = award_xp
    where id = p_order_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (
      p_reviewer_id, 'approve_profile_frame_order', 'profile_frame_order', order_row.id,
      jsonb_build_object('user_id', order_row.user_id, 'frame_id', order_row.frame_id,
        'price_inr', order_row.price_inr, 'xp_awarded', award_xp)
    );

  return jsonb_build_object('success', true, 'status', 'approved', 'xp_awarded', award_xp, 'levels_earned', levels_earned);
end;
$$;

revoke all on function public.review_profile_frame_order(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.review_profile_frame_order(uuid, uuid, text) to service_role;

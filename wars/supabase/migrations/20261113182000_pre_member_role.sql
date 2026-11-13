insert into public.roles (name, description, priority)
values ('pre_member', 'Pre-member community status with reader-level access', 20)
on conflict (name) do update
set description = excluded.description,
    priority = excluded.priority;

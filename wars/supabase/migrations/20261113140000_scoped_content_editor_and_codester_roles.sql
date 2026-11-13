insert into public.roles (name, description, priority) values
  ('codester', 'Owner-equivalent access across the WARS website', 100),
  ('manga_editor', 'Create and manage manga and light novel content only', 35),
  ('anime_editor', 'Create and manage anime series and movie content only', 35)
on conflict (name) do update set
  description = excluded.description,
  priority = excluded.priority;

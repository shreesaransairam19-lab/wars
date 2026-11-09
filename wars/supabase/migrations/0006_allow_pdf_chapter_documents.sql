-- Permit PDF chapter documents alongside existing EPUB and image assets.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/epub+zip',
  'application/pdf'
]
where id = 'chapter-assets';

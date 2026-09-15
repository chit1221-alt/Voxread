/* VoxRead service worker — share target handling only.
   Deliberately does NOT cache the app shell, so the live site is never stale. */

const SHARE_CACHE = 'voxread-share';
const SHARE_KEY = 'shared-item';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Android hands shared content here as a POST. Everything else is left alone.
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  try {
    const form = await request.formData();
    const cache = await caches.open(SHARE_CACHE);

    const files = form.getAll('file').filter((f) => f && typeof f.size === 'number');
    if (files.length > 0) {
      const file = files[0];
      const headers = new Headers();
      headers.set('Content-Type', file.type || 'application/octet-stream');
      headers.set('X-Share-Filename', encodeURIComponent(file.name || 'shared'));
      await cache.put(SHARE_KEY, new Response(file, { headers }));
      return Response.redirect('./?shared=1', 303);
    }

    // Shared plain text or a link rather than a file.
    const parts = [form.get('title'), form.get('text'), form.get('url')]
      .filter((v) => typeof v === 'string' && v.trim().length > 0);

    if (parts.length > 0) {
      const headers = new Headers();
      headers.set('Content-Type', 'text/plain');
      headers.set('X-Share-Filename', encodeURIComponent('Shared text.txt'));
      await cache.put(SHARE_KEY, new Response(parts.join('\n\n'), { headers }));
      return Response.redirect('./?shared=1', 303);
    }
  } catch (err) {
    // fall through to the error redirect
  }

  return Response.redirect('./?shared=error', 303);
}

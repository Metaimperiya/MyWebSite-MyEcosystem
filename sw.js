const CACHE_NAME = 'metaimperiya-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/components.css',
  '/css/mobile.css',
  '/js/firebase.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/feed.js',
  '/js/profile.js',
  '/js/friends.js',
  '/js/groups.js',
  '/js/chat.js',
  '/js/notifications.js',
  '/js/admin.js',
  '/js/player.js',
  '/site.webmanifest'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(urlsToCache); })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) { return response || fetch(event.request); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
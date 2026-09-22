self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
    var data = { title: 'DOSS OS', body: 'Напоминание' };
    try { if (event.data) data = event.data.json(); } catch (e) {}
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '../assets/images/metaimperiya-192x192.png'
        })
    );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || 'ZENIT Protocol';
  const body = data.body || 'You have a new account notification.';
  const notificationId = data.notificationId || null;
  const url = data.url || (notificationId ? '/?notification=' + encodeURIComponent(notificationId) : '/');
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon: '/zenit-logo.png',
        badge: '/zenit-logo.png',
        tag: notificationId ? 'zenit-' + notificationId : 'zenit',
        renotify: Boolean(notificationId),
        data: { url, notificationId }
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients =>
        clients.forEach(client => client.postMessage({ type: 'zenit:push-notification', notification: data }))
      )
    ])
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL(event.notification?.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => {
        try { return new URL(client.url).origin === self.location.origin; } catch (_) { return false; }
      });
      if (existing && 'focus' in existing) {
        existing.navigate(destination);
        return existing.focus();
      }
      return self.clients.openWindow(destination);
    })
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients =>
      clients.forEach(client => client.postMessage({ type: 'zenit:push-subscription-change' }))
    )
  );
});

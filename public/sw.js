self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "notify" || typeof data.title !== "string") return;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body ?? "",
      tag: data.tag ?? "komsudan",
      icon: data.icon ?? "/icon",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

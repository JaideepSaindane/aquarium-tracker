// App-shell + Web Push service worker (T-010 install/activate, T-018 push
// handling). No offline caching strategy yet — that's a separate concern
// from push and hasn't blocked anything so far, per Principle 05 (SQLite is
// the real source of truth; the network, and this worker, are enhancements).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "AquaAI", body: "You have a reminder.", taskId: "", tankId: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Not JSON — fall back to the default payload above rather than throwing.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { taskId: payload.taskId, tankId: payload.tankId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { tankId } = event.notification.data || {};
  const url = tankId ? `/tank/${tankId}/schedule` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.length > 0 && "focus" in clients[0]) {
        clients[0].navigate(url);
        return clients[0].focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

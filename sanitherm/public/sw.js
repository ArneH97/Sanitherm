// Sanitherm service worker — toont pushmeldingen en opent de app bij een tik.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const titel = data.title || "Sanitherm";
  const opties = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/week" },
    tag: data.tag || "sanitherm",
  };
  event.waitUntil(self.registration.showNotification(titel, opties));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const doelUrl = (event.notification.data && event.notification.data.url) || "/week";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientLijst) => {
        for (const client of clientLijst) {
          if (client.url.includes(doelUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(doelUrl);
      })
  );
});

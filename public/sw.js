/* Hartefelder Hobby-Dartturnier — Service Worker
   Hält die App offline lauffähig. Turnierdaten liegen im localStorage
   der Seite, hier wird nur die App selbst zwischengespeichert.
   Bei Änderungen an index.html die VERSION hochzählen.            */

var VERSION = "hhdt-v5";
var CORE = [
  "./",
  "./index.html",
  "./config.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      // Einzeln, damit ein fehlender CDN-Treffer nicht alles scheitern lässt.
      return Promise.all(CORE.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isApiCall(url) {
  return url.indexOf("/rest/v1/") > -1 ||
         url.indexOf("/realtime/") > -1 ||
         url.indexOf("/auth/v1/") > -1;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = req.url;
  if (url.indexOf("http") !== 0) return;
  if (isApiCall(url)) return;              // Supabase immer direkt ans Netz

  // Seitenaufrufe: erst Netz (für Updates), sonst der gespeicherte Stand.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (m) {
          return m || new Response("Offline und nichts gespeichert.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        });
      })
    );
    return;
  }

  // Alles andere: gespeicherter Stand zuerst, sonst nachladen und merken.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return new Response("", { status: 504 });
      });
    })
  );
});

/* Automatische Turnier-Sicherung.
   POST  /api/backup?k=SCHLÜSSEL         legt einen neuen Stand ab
   GET   /api/backup?k=SCHLÜSSEL         listet die vorhandenen Stände
   GET   /api/backup?k=SCHLÜSSEL&key=…   liefert einen davon zurück

   Der Schlüssel steht als Umgebungsvariable HHDT_BACKUP_KEY in Netlify
   und muss mit dem Wert in config.js übereinstimmen.                   */

import { getStore } from "@netlify/blobs";

const KEEP = 60;              // so viele Stände bleiben erhalten
const MAX_BYTES = 4_000_000;

function secret() {
  try { if (typeof Netlify !== "undefined") return Netlify.env.get("HHDT_BACKUP_KEY") || ""; }
  catch { /* ältere Laufzeit */ }
  return (typeof process !== "undefined" && process.env && process.env.HHDT_BACKUP_KEY) || "";
}

export default async (req) => {
  const url = new URL(req.url);
  const want = secret();

  if (!want) return json({ error: "HHDT_BACKUP_KEY ist in Netlify nicht gesetzt" }, 500);
  const given = url.searchParams.get("k") || req.headers.get("x-hhdt-key") || "";
  if (given !== want) return json({ error: "Schlüssel stimmt nicht" }, 401);

  const store = getStore("hhdt-backups");

  if (req.method === "POST") {
    const body = await req.text();
    if (!body || body.length > MAX_BYTES) return json({ error: "Größe" }, 413);
    try { JSON.parse(body); } catch { return json({ error: "kein JSON" }, 400); }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await store.set(stamp, body);
    await store.set("latest", body);

    // Alte Stände abräumen, damit der Speicher nicht unbegrenzt wächst.
    try {
      const { blobs } = await store.list();
      const old = blobs.map((b) => b.key).filter((k) => k !== "latest").sort();
      for (const k of old.slice(0, Math.max(0, old.length - KEEP))) await store.delete(k);
    } catch { /* Aufräumen ist Kür */ }

    return json({ ok: true, key: stamp, bytes: body.length });
  }

  if (req.method === "GET") {
    const one = url.searchParams.get("key");
    if (one) {
      const txt = await store.get(one);
      if (txt == null) return json({ error: "nicht gefunden" }, 404);
      return new Response(txt, { headers: { "content-type": "application/json; charset=utf-8" } });
    }
    const { blobs } = await store.list();
    const keys = blobs.map((b) => b.key).filter((k) => k !== "latest").sort().reverse().slice(0, 60);
    return json({ ok: true, count: keys.length, keys });
  }

  return json({ error: "Methode" }, 405);
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export const config = { path: "/api/backup" };

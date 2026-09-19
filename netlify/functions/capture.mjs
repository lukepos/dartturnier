/* Postfach für die persönliche Handy-Erfassung der Turnierleitung.
   GET/POST /api/capture?k=SCHLÜSSEL&what=board     aktuell offene Partien
   POST     /api/capture?k=SCHLÜSSEL&what=report     Handy meldet ein Ergebnis
   GET      /api/capture?k=SCHLÜSSEL&what=reports    Laptop liest das Postfach
   POST     /api/capture?k=SCHLÜSSEL&what=clear&id=… Laptop räumt eine Meldung ab

   Derselbe Schlüssel wie /api/backup (HHDT_BACKUP_KEY) — kein zweites
   Geheimnis nötig. Das Backend kennt den Turnierstand selbst nicht, es
   transportiert nur kleine, für Menschen lesbare Strings.               */

import { getStore } from "@netlify/blobs";

const MAX_REPORTS = 40;
const MAX_BOARD_BYTES = 200_000;
const MAX_REPORT_BYTES = 2_000;

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

  const what = url.searchParams.get("what") || "";
  const store = getStore("hhdt-capture");

  if (what === "board") {
    if (req.method === "POST") {
      const body = await req.text();
      if (!body || body.length > MAX_BOARD_BYTES) return json({ error: "Größe" }, 413);
      try { JSON.parse(body); } catch { return json({ error: "kein JSON" }, 400); }
      await store.set("board", body);
      return json({ ok: true });
    }
    if (req.method === "GET") {
      const txt = await store.get("board");
      return new Response(txt || '{"items":[]}', {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    }
    return json({ error: "Methode" }, 405);
  }

  if (what === "report") {
    if (req.method !== "POST") return json({ error: "Methode" }, 405);
    const body = await req.text();
    if (!body || body.length > MAX_REPORT_BYTES) return json({ error: "Größe" }, 413);
    let rep; try { rep = JSON.parse(body); } catch { return json({ error: "kein JSON" }, 400); }
    if (!rep || !rep.dk || !rep.v) return json({ error: "unvollständig" }, 400);
    rep.id = rep.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 9));

    const cur = (await store.get("reports", { type: "json" })) || [];
    cur.push(rep);
    if (cur.length > MAX_REPORTS) cur.splice(0, cur.length - MAX_REPORTS);
    await store.setJSON("reports", cur);
    return json({ ok: true, id: rep.id });
  }

  if (what === "reports") {
    if (req.method !== "GET") return json({ error: "Methode" }, 405);
    const cur = (await store.get("reports", { type: "json" })) || [];
    return json({ ok: true, items: cur });
  }

  if (what === "clear") {
    if (req.method !== "POST") return json({ error: "Methode" }, 405);
    const id = url.searchParams.get("id") || "";
    const cur = (await store.get("reports", { type: "json" })) || [];
    await store.setJSON("reports", cur.filter((r) => r.id !== id));
    return json({ ok: true });
  }

  return json({ error: "unbekannt" }, 400);
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export const config = { path: "/api/capture" };

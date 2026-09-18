# Hartefelder Hobby-Dartturnier — Turnier-App

Statische Seite ohne Build-Schritt. Turnierleitung und Anzeigebildschirm
öffnen dieselbe URL und wählen beim ersten Aufruf ihre Rolle.

Die App arbeitet **lokal zuerst**: Jede Eingabe landet sofort im Browser
des Leitungsgeräts. Ein Server ist optional — hängt der Anzeigebildschirm
per HDMI am selben Rechner, brauchst du gar keinen. Ist Supabase
eingetragen, werden die Änderungen zusätzlich hochgeschickt und bei
fehlender Verbindung nachgereicht.

**Für den geplanten Aufbau (ein Laptop, Fernseher per HDMI) reicht der
Betrieb ohne Server.** Siehe `DEPLOY.md`, Teil 6.

## Dateien

| Datei | Zweck |
|---|---|
| `public/index.html` | die komplette App |
| `public/` | alles, was veröffentlicht wird |
| `public/config.js` | Supabase-Zugangsdaten — **hier eintragen** |
| `supabase.sql` | Datenbank-Setup, einmal ausführen |
| `public/sw.js` | Service Worker, hält die App offline lauffähig |
| `manifest.webmanifest`, `icon-*.png` | Installierbarkeit als App |
| `netlify.toml` | Caching-Regeln |
| `DEPLOY.md` | Einrichtung und Turnierabend Schritt für Schritt |
| `GIT-NETLIFY.md` | Git und Netlify mit allen Variablen |
| `netlify/functions/backup.mjs` | automatische Serversicherung |
| `package.json` | Abhängigkeit der Function |

## 1. Supabase einrichten (optional)

Nur nötig, wenn Ergebnisse von mehreren Geräten kommen sollen oder
Zuschauer auf ihren Handys mitlesen. Sonst überspringen und `public/config.js`
leer lassen.

1. Auf supabase.com ein Projekt anlegen (Region Frankfurt ist am nächsten).
2. `supabase.sql` öffnen und bei `crypt('DEIN-PIN', …)` die PIN der
   Turnierleitung eintragen. Vier bis sechs Ziffern reichen.
3. Den gesamten Inhalt in Supabase unter **SQL Editor** einfügen und
   ausführen.
4. Unter **Project Settings → API** die *Project URL* und den
   *anon public* Key kopieren.

Der anon-Key ist für den Browser gedacht und darf öffentlich sein: Lesen
ist für alle erlaubt, Schreiben geht ausschließlich über `save_doc()` und
nur mit korrekter PIN. Den `service_role`-Key niemals in `public/config.js`
eintragen.

## 2. Verbinden

In `public/config.js` die beiden Werte eintragen:

```js
window.HHDT_CONFIG = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseKey: "eyJhbGciOi..."
};
```

Bleiben die Felder leer, läuft die App rein lokal in einem Browser —
praktisch zum Ausprobieren, bevor Supabase steht.

## 3. Auf Netlify bringen

**Schnellster Weg:** Ordner (oder ZIP) auf app.netlify.com/drop ziehen.
Fertig, die URL steht sofort.

**Mit Git:** Repository verbinden, kein Build-Command, Publish-Verzeichnis
`.` — steht schon in `netlify.toml`.

Bei jeder Änderung an `public/index.html` in `public/sw.js` die Zeile
`var VERSION = "hhdt-v1"` hochzählen, sonst liefert der Service Worker
auf schon besuchten Geräten weiter die alte Version aus.

## 4. Am Turnierabend

Ausführlich steht das in `DEPLOY.md`. Kurzfassung:

- **Leitungsgerät:** URL öffnen, „Turnierleitung", PIN eingeben. Die Rolle
  bleibt auf dem Gerät gespeichert.
- **Fernseher per HDMI:** zweites Browserfenster auf demselben Rechner,
  URL mit `#anzeige` am Ende, auf den zweiten Bildschirm ziehen, F11.
  Beide Fenster teilen den Speicher — das läuft komplett ohne Internet.
- **Eigenes Anzeigegerät mit Netz:** URL öffnen, „Anzeige starten". Die
  Rolle bleibt gespeichert, PIN wird nicht gebraucht.
- **Sicherung:** im Block „Verbindung" mehrfach am Abend eine JSON-Datei
  herunterladen. Ohne Internet ist das deine einzige Kopie.
- Oben rechts im Anzeige-Modus schaltest du zwischen Team und Einzel
  sowie Tabellen und Baum um. „Auto" wechselt alle 20 Sekunden durch.
- Der Verbindungsstatus steht im Kopfbereich und unten im Block
  „Verbindung": *Verbunden*, *Offline* mit Anzahl wartender Änderungen,
  oder *Nur lokal*.

**Vorher einmal testen:** Leitungsgerät und Anzeigegerät gleichzeitig
öffnen, ein Ergebnis eintragen und schauen, ob der Bildschirm nachzieht.
Danach das WLAN am Leitungsgerät abschalten, weitertippen, wieder
einschalten — die Änderungen müssen von selbst ankommen.

## Was die App kann

- Anmeldungen für Einzel und Team getrennt, je 32 Plätze, mit
  Sammel-Import aus den Anmelde-Mails
- Startgeld-Übersicht (8 € je Spieler), Check-in vor Ort, U18-Markierung
- Gruppenauslosung mit gleich großen Gruppen, Teilnehmer nachträglich
  verschiebbar
- Live-Tabellen: 2 Punkte je Sieg, Legdifferenz, wahlweise direkter
  Vergleich als erstes Kriterium
- KO-Baum, gesetzt nach Gruppenplatz oder frei ausgelost, mit Freilosen,
  Spiel um Platz 3 und Siegerblock
- Spielmodi automatisch nach Ausschreibung: Gruppe 301 Straight-Out,
  bis Viertelfinale 301 Double-Out, ab Halbfinale 501 Double-Out
- Scheibenzuteilung mit Automatik, die niemanden auf zwei Scheiben
  gleichzeitig stellt; nach jedem Ergebnis rückt die nächste Partie nach
- Kennung je Partie (`T14`, `E·VF2`) auf Scheibenkarte, Spielliste und
  Fernseher
- Zeitplan über beide Klassen mit Warnung, wenn ihr Mitternacht reißt

## Vereinsfarbe ändern

Ganz oben in `public/index.html` stehen zwei Zeilen:

```css
--brand:#1C4B33;       /* auf hellem Grund */
--brand-dark:#7FB89A;  /* auf dunklem Grund — Anzeige und Dunkelmodus */
```

Beide auf die echten Farben der Bruderschaft setzen, sonst nichts. Die
Farbe trägt Kopfzeile, Wappen, Hauptknopf, Zeitstrahl, Siegerblock und das
Scheibenband auf dem Fernseher. Der dunkle Wert muss auf schwarzem Grund
noch gut lesbar sein — eine sehr dunkle Vereinsfarbe also aufhellen, nicht
unverändert übernehmen.

## Grenzen

- **Ein Schreiber.** Wenn zwei Geräte gleichzeitig als Leitung eingeloggt
  sind und beide offline etwas ändern, gewinnt beim Wiederverbinden der
  spätere Stand komplett — die Änderungen des anderen gehen verloren.
  Für einen Turnierleiter plus Anzeigegeräte ist das unkritisch.
- **PIN statt echter Benutzerverwaltung.** Wer die PIN hat, darf alles
  ändern. Für ein Hobbyturnier ausreichend, für mehr nicht.
- **Feste Turnierdaten.** Name, Datum, Anmeldeschluss, die 32er-Grenze
  und das Startgeld stehen in `public/index.html`. Für ein zweites Turnier
  müssen die raus in eine Konfiguration.

// ---------------------------------------------------------------------
//  Einstellungen.  Ausführlich: DEPLOY.md
//
//  backupKey   Automatische Serversicherung über /api/backup.
//              Denselben Wert in Netlify als Umgebungsvariable
//              HHDT_BACKUP_KEY hinterlegen. Leer lassen = aus.
//              Der Wert steht im Quelltext der Seite und ist damit kein
//              Geheimnis — es geht nur um Namen und Spielstände.
//
//  supabaseUrl / supabaseKey
//              Nur nötig, wenn mehrere GERÄTE gleichzeitig erfassen
//              sollen. Hängt der Fernseher per HDMI am selben Rechner,
//              lass beides leer.
//              Key = Publishable key (sb_publishable_...) oder der
//              ältere anon public key. NIEMALS der Secret- bzw.
//              service_role-Key.
// ---------------------------------------------------------------------
window.HHDT_CONFIG = {
  backupKey: "7*dqgfBrTG8rdbJHnwm2",
  supabaseUrl: "",
  supabaseKey: ""
};

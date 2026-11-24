# SEF Lernapp – Projektnotizen für Claude

Private Progressive Web App (Lernapp „Sicherer Einsatzfahrer“, Rotes Kreuz Tirol) für iPhone und Android.
Gehostet über **GitHub Pages** (Ordner `/ (root)`), auf den Handys über „Zum Home-Bildschirm“ installiert.
Der Nutzer ist kein Entwickler: auf Deutsch, einfach und Schritt für Schritt erklären.
**Vor jedem Push/Hochladen nachfragen und Änderungen zuerst als Vorschau (Screenshots) zeigen.**
Gleicher Aufbau wie die frühere App des Nutzers „alpinwetter“.

## Dateien (alle im Root, keine Unterordner)
- `index.html` – die komplette App: HTML + inline JS + **vorkompiliertes Tailwind-CSS** in `<style id="tw">`
- `fragen.js` – Fragenkatalog: `SEF_KATEGORIEN` (5 Tests wie im Kurs) und `SEF_FRAGEN`
  (`id`, `k` Kategorie, `m` Mehrfachauswahl 1/0, `f` Frage, `a` Antworten a–d wie im Kurs, `r` richtige Indizes,
  `v: 0` = Lösung NICHT vom Kurs bestätigt, `h` = Begründung des Vorschlags). Die `id` nie ändern (Lernstand hängt daran).
- `sw.js` – Service Worker: App-Seite und `fragen.js` „Netz zuerst“ (3,5 s Zeitlimit, sonst Cache), Icons/Manifest
  stale-while-revalidate, alle Downloads mit `cache: 'reload'`/`'no-cache'`. Antwortet auf `postMessage('version')` mit `{ cache }`.
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
  (Icon: Blaulicht + „SEF“ – bewusst ohne Rotkreuz-Emblem, das ist gesetzlich geschützt)
- `README.md` – Anleitung für den Nutzer (Deutsch)

## Fragen-Quelle
Screenshots aus dem Moodle-Kurs „Multiple Choice Fragen aus dem SEF Bereich“ (kurse.roteskreuz.at, LV Tirol, 24.11.2026).
Lösungen aus „Die richtige(n) Antwort(en) ist/sind: …“ übernommen; offensichtliche Tippfehler des Kurses korrigiert.
Fahrphysik Frage 47 war eine Doppelung von 46 → weggelassen (Fahrphysik hat daher 48 statt 49 Fragen).
29 Fragen (Fahrphysik 36–49, Gefahrenlehre 1–16) waren in den Screenshots unbeantwortet. Dafür gab es zuerst
Lösungsvorschläge; der Nutzer hat alle im Kurs geprüft (Fahrphysik 48, Gefahrenlehre 6, 8, 10, 11 korrigiert).
→ Seit Version 3 sind **alle 123 Lösungen bestätigt**. Die Markierung `v: 0` (+ Begründung `h`) bleibt im Code für
künftige neue, unbestätigte Fragen: dann erscheinen Hinweis, Filter „Unbestätigt“ und gelbe Kennzeichnung automatisch.

## Aufbau von index.html (ein IIFE im letzten `<script>`)
- **Zustand / localStorage:** `sef_stats_v1` (je Frage `{ n, ok, s (Serie), w, last, t }`), `sef_marks_v1`,
  `sef_exams_v1` (max. 20), `sef_settings_v1` (`shuffle`, `round`, `examN`, `reveal`), `sef_tab`, `sef_theme`.
- **Status:** `neu` / `ueben` / `sicher` (Serie ≥ `SICHER` = 2); „falsch“ = letzte Antwort falsch.
- **Bewertung** `grade()`: ok nur bei exakt allen richtigen Antworten; sonst `part` (mind. 1 richtige) oder `wrong`.
- **Tabs:** `renderLernen()` (Hero, Schnellzugriffe, Kategorien → `openCatSheet`), `renderPruefung()`,
  `renderFragenShell()` + `renderFragenList()` (Suche/Filter, Schalter „Lösungen“).
- **Quiz** (Vollbild `#quiz`): `session` = `{ mode: 'learn'|'exam', ids, i, order (gemischte Antworten), sel, checked, res }`,
  `renderQuiz()`, `renderSummary()`, `pickLearn()` (falsch → üben → neu → sicher), `pickExam()` (anteilig, je Kategorie ≥ 1).
- **Navigation/Zurück-Geste:** Ebenen-Stapel `stack` (`quiz`/`sheet`/`dlg`) mit `pushLayer()`/`popLayers(k)` + `popstate`.
  Laufende Prüfung: Zurück → Rückfrage `askAbortExam()`.
- **Design:** wie AlpinWetter – weiche runde Karten (`PANEL` = `rounded-[1.75rem]`), Neutralfarben `zinc`, Akzent Rot,
  Kategorie-Farben in `KSTYLE` (vollständige Klassen!), Pillen-Umschalter, Bottom-Sheets, Material-3-Tab-Pille.
  Darstellung `sef_theme`: null = automatisch, 'light', 'dark'.
- **Events:** ein zentraler Click-Handler über `data-act` / `data-tab`.

## WICHTIG: Tailwind ist vorkompiliert (kein CDN)
Neue oder geänderte Tailwind-Klassen wirken erst, nachdem das CSS neu gebaut wurde:
1. Klassen immer als **vollständige Strings** schreiben (kein `bg-${farbe}-500`).
2. Kopie von `index.html` mit geleertem `<style id="tw">…</style>` erzeugen (nur scannen, nicht ausliefern).
3. Bauen mit Tailwind **v3**:
   ```
   npm i -D tailwindcss@3
   # tailwind.config.js:
   # module.exports = { darkMode: 'class', content: ['<kopie>.html'],
   #   theme: { extend: { fontFamily: { sans: ['-apple-system','BlinkMacSystemFont','"Segoe UI"','Roboto','Helvetica','Arial','sans-serif'] } } } };
   # in.css: @tailwind base; @tailwind components; @tailwind utilities;
   npx tailwindcss -c tailwind.config.js -i in.css -o app.min.css --minify
   ```
4. Inhalt von `<style id="tw">` in `index.html` durch `app.min.css` ersetzen. Build-Dateien nicht committen.

## Checkliste für jede Änderung
1. Inline-Scripts und `fragen.js` mit `node --check` prüfen.
2. Im Browser testen (Playwright/Chromium ist in Cloud-Sessions vorinstalliert), Screenshots als Vorschau zeigen.
3. Version erhöhen – **beide** zusammen: `CACHE = 'sef-lernapp-vN'` in `sw.js` und `APP_BUILD = N` in `index.html`
   (Anzeige „Version N · Datum“ in den Einstellungen; `APP_VERSION` enthält das Datum).
4. Nach Rückfrage committen und pushen; GitHub Pages veröffentlicht in 1–2 Minuten.

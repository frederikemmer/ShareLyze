# Private ShareLyze-Statistiken · HTML-Konzepte

Nutzerkontext: private Freigaben an Familie und Freunde, sehr wenige Aufrufe über längere Zeit. Fokus auf absolute Ereignisse, zeitliche Nachvollziehbarkeit und einzelne Links. Keine Wachstums-/Business-KPIs. Frühere Statistikentwürfe bleiben erhalten.

## Sechs eigenständige Einstiegsseiten

| Konzept | Übersicht | Einzel-Link |
| --- | --- | --- |
| Ruhiger Überblick | `01-ruhig-overview.html` | `01-ruhig-detail.html` |
| Abruf-Tagebuch | `02-tagebuch-overview.html` | `02-tagebuch-detail.html` |
| Langzeit-Album | `03-album-overview.html` | `03-album-detail.html` |

Alle Dateien enthalten CSS, JavaScript, ShareLyze-Logo und Lucide-SVGs und lassen sich offline öffnen. Jede Seite erlaubt zusätzlich den lokalen Wechsel zwischen Konzepten und Übersicht/Einzel-Link. Kein Server erforderlich. Generator: `python3 docs/design/private-statistics/generate.py`.

## Unterschiede

1. **Ruhiger Überblick:** kompakte Flächen, drei Ereignisarten als gemeinsame gruppierte Balken. Die Nulltage bleiben sichtbar.
2. **Abruf-Tagebuch:** drei Ereignisspuren auf derselben Zeitachse. Vertikal ausgerichtete Punkte machen Aufruf, Start und Abschluss an einem Tag vergleichbar. Punkte stehen für mindestens ein Ereignis, genaue Zahlen im gemeinsamen Readout.
3. **Langzeit-Album:** monatlicher Kalender in der Gesamtübersicht; im Einzel-Link gemeinsame kumulierte Treppenkurven. Flache Abschnitte bedeuten keine neuen Ereignisse; die Summierung beginnt beim gewählten Zeitraum. Einzelereignisse darunter beziehen sich ausdrücklich auf den ausgewählten Tag, nicht auf die kumulierte Gesamtheit.

## Beispielwerte und Interaktion

- Gemeinsame Fixture mit drei privaten Freigaben und insgesamt 14 Aufrufen, 11 Downloadstarts und 10 Serverabschlüssen über 90 Tage. Der erste Link hat 7 / 6 / 5 Ereignisse. Browserverteilungen, Diagramme, Kennzahlen und Abruflisten werden aus denselben Ereignissen berechnet.
- Zeitraum 90/30/7 Tage. Einzel-Link zusätzlich Stunden eines Datums und Live-Demo; direkter Wechsel vom ausgewählten Diagrammtag zu Stundenwerten.
- Maus-/Pointer-Auswahl, Touch-Pointerhandler, nativer Range-Regler mit Tastatur, gemeinsames Readout aller eingeblendeten Metriken, Serien ein-/ausblenden.
- Einzel-Link unter dem Graphen: aktive Tage, letztes Ereignis, betroffene Dateien, Browser-/OS-Kombinationen, Ereignisliste für den ausgewählten Zeitpunkt und aufgeklappte Abrufdetails. Beispiel-IP aus dem reservierten Dokumentationsbereich 192.0.2.0/24; keine realen Nutzerdaten. User-Agent ist keine Identität.
- Die Live-Demo startet ohne Ereignisse; ein lokaler Timer erzeugt alle acht Sekunden ein simuliertes Ereignis. 15 Minutenraster einschließlich laufender Minute, Pause/Fortsetzen, keine Ereigniserzeugung im Hintergrundtab. Erzeugte Demoereignisse bleiben bis zum Neuladen in der lokalen Seite; keine Persistenz und keine API-Verbindung.
- Kalender markiert Tage mit mindestens einem Ereignis pro eingeblendeter Metrik; Zeiträume außerhalb der Auswahl sind deaktiviert. Vor/Zurück blättert innerhalb des ausgewählten Zeitraums.
- Hell-/Dunkelmodus. Oberes App-Menü ist eine reine Designreferenz.

## Herkunft und Umfang

CSS-Grundlage ist der im vorherigen Entwurf eingebettete ShareLyze-CSS-Snapshot; neue Regeln in `private.css`, Interaktion in `private.js`. Bestehendes ShareLyze-Logo; Lucide-Lizenz in `LUCIDE-LICENSE.txt`. Keine SelfDrop-Bestandteile oder zusätzlichen Laufzeitabhängigkeiten. Keine produktive Statistikimplementierung in diesem Auftrag.

## Prüfung

- JS-Syntaxprüfung erfolgreich.
- Alle sechs Einstiege bei 1200 px als HTML gerendert und visuell geprüft; drei Detailkonzepte bei 390 px, einschließlich Wechsel zur Kalenderübersicht, geprüft. Ein Detailkonzept zusätzlich hell geprüft.
- Skriptgestützte DOM-Prüfungen für konsistente Fixture-Summen, Nulltag, Stundenvertiefung, Serienumschaltung, Linkfilter, leere Liveansicht, Pause, Gesamtübersicht, Kalenderauswahl, Theme und Seitenbreite erfolgreich. Kein horizontaler Seitenüberlauf bei 390 px.
- Kontrolliert ausgelöste Live-Ticks prüfen Minutenzuordnung, Pause/Fortsetzen und Diagramm-Pointerauswahl. Erste Prüfläufe hatten Fehler im Prüfharness (nicht-bubbelndes Change-Event und zu breiter Theme-Selektor); mit korrekten DOM-Ereignissen/Selektoren bestanden.
- Keine physische Touchprüfung, vollständige manuelle Tastatur-/Screenreaderabnahme oder echte Live-/API-Prüfung. Weitere Auswahl und produktive Integration offen.

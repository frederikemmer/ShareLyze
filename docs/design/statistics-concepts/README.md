# Statistik-Entwürfe · 6. November 2026

Drei eigenständige, offline nutzbare HTML-Seiten. Direkt im Browser öffnen; CSS, Lucide-SVGs und ShareLyze-Logo sind eingebettet. Über die Entwurfsnavigation zwischen den benachbarten Dateien wechseln.

- `01-insights.html`: ausgewogenes Dashboard mit Kennzahlen, Verlauf, Insights, Dateien, Herkunft, Browsern und Linkvergleich.
- `02-studio.html`: kompakter Analysearbeitsplatz mit Kennzahlnavigation, Zeitraster, Vergleich und Ereignissen.
- `03-report.html`: redaktioneller Report mit großzügiger Typografie und vier Kapiteln.

Die Basis ist ein eingebetteter Snapshot von `frontend/src/style.css` plus isolierte Entwurfsregeln. Logo aus `frontend/public/logo-dark-transparent.svg`; Lucide aus der bereits installierten lucide-react-Version, Lizenz siehe `LUCIDE-LICENSE.txt`. Kein SelfDrop-Material und keine zusätzlichen Laufzeitabhängigkeiten. `generate.py` erzeugt die drei Dateien reproduzierbar aus dem vorhandenen CSS und `icons.json`.

## Demo-Umfang

Zeitraum 7/28 Tage, Theme, Linksuche einschließlich Leerzustand, Linkdetails und CSV-Export sind implementiert. Dashboard und Studio erlauben den Wechsel der Verlaufskennzahl. Das obere App-Menü bildet nur die bestehende Navigation ab; die Ziele führen nicht in die produktive Anwendung.

Alle Werte sind erfunden. KPI-, Tabellen- und Dateizahlen werden beim Zeitraumwechsel für die Demo skaliert. Kurven sind illustrative Tagesverläufe, keine exakt aus den Summen rekonstruierte Zeitreihe. Vergleiche und redaktionelle Insights sind Beispielaussagen. Browser-/Referrer-Anteile und Heatmap sind feste illustrative Zusatzanalysen; ZIP-Zahlen beziehen sich ausdrücklich auf das 28-Tage-Beispiel. Keine eindeutigen Personen, Geo-IP, Conversion-Funnels oder bestätigten Dateispeicherungen behauptet.

Der bei Erstellung der ersten Konzepte gelesene API-Stand lieferte Links, Tageswerte, Dateien und die letzten 200 Ereignisse; parallele Weiterentwicklungen des Backends sind hier nicht bewertet. Vollständige Zeitraumfilter, Vorperiodenvergleiche, stündliche Heatmaps und vollständige Browser-/Referrer-Aggregationen brauchen eine gesonderte Umsetzung; die letzten 200 Ereignisse sind dafür keine vollständige Datenbasis.

## Prüfung

- HTML-Render-Vorschauen aller drei Entwürfe bei 1440 px und 390 px betrachtet; Report zusätzlich hell bei 1440 px.
- Skriptgestützte DOM-Prüfungen in der HTML-Vorschau: Zeitraumwerte, Suche, Leerzustand, Öffnen/Schließen von Details, Theme und Kennzahlwechsel (wo vorhanden) bestanden. Nach Korrektur kein seitlicher Seitenüberlauf bei 390 px; Tabellen scrollen intern.
- Keine gemeldeten Konsolenfehler im abschließenden mobilen Prüflauf.
- CSV-Download ist implementiert, aber nicht als heruntergeladene Datei verifiziert. Keine manuelle Tastatur-/Touch-, Screenreader-, vollständige Browser- oder produktive API-Abnahme.
- Keine Änderung an der produktiven Statistikseite durch diese Entwurfsarbeit; das Insights-Dashboard wurde inzwischen als bevorzugte Richtung ausgewählt.


## Insights-Dashboard: interaktive Vertiefung

Die erste Variante wurde auf Nutzerwunsch erweitert; Studio und Report bleiben unverändert.

- Diagrammwerte per Mausbewegung, Pointer-/Touch-Ziehen und zugänglichem Range-Regler auswählen. Fadenkreuz, Datum und exakter Wert; Regler auch mit Pfeiltasten bedienbar.
- Auswahl über „Statistik öffnen“ oder einen Titel im Linkvergleich öffnet einen nativen modalen Dialog. Kennzahlen und Verlauf sind auf die ausgewählte Freigabe bzw. den Kurzlink begrenzt; Wechsel im Dialog möglich.
- 28 Tage, 7 Tage, einzelner Tag mit 24 Stunden und Live-Demo. Tagesauswahl mit Datum/Zurück/Weiter sowie direkter Wechsel vom ausgewählten Tagespunkt zur Stundenansicht.
- Live ist eine ausdrücklich gekennzeichnete lokale Simulation: rollendes 90-Sekunden-Fenster in 3-Sekunden-Intervallen, Ereignisliste, Aktualisierungszeit, Pause/Fortsetzen. Beim Fortsetzen und nach längeren Unterbrechungen wird das Demo-Fenster neu initialisiert. Timer wird beim Schließen entfernt, Hintergrundtabs erzeugen keine Ereignisse.
- Kurzlinks zeigen nur Weiterleitungen. Freigaben zeigen Aufrufe, Downloadstarts und Serverabschlüsse. Keine personenbezogene Conversion.
- Neue interaktive Kurven sind synthetische ganzzahlige Verteilungen mit zum jeweiligen Demo-Gesamtwert passenden Summen. Die Vorperiodenkurve der Übersicht bleibt illustrative Vergleichsverteilung. Die anderen Zusatzanalysen der Ausgangsversion bleiben feste Beispiele.
- Quellen: `insights-interactive.js` und `insights-interactive.css`; der Generator bettet beide ausschließlich in `01-insights.html` ein. HTML weiterhin ohne Server und externe Abhängigkeiten nutzbar.

Geprüft: JavaScript-Syntax; gerenderte Desktop-/Mobilvorschau bei 1440/390 px und Übersicht bei 728 px. Skriptgestützte DOM-Prüfung von Pointer-Auswahl, Regler, Linkwechsel, Tagesvertiefung, Datumsnavigation, Kennzahlwechsel, Live-Modus, Pause/Fortsetzen, Kurzlinktrennung, Dialogschließen/Timerabbau. Live-Ticks wurden in der Vorschau kontrolliert ausgelöst; kein echter Serverstream. Kein seitlicher Seiten-/Dialogüberlauf bei 390 px. Physische Touchgesten und manuelle vollständige Tastatur-/Screenreaderprüfung bleiben offen.

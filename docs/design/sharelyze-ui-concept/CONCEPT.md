# ShareLyze: UI-Konzept aus der Icon-Formensprache

Status: Bisherige Entwürfe einschließlich der technischeren Variante vom Nutzer verworfen. Drei neue Richtungen zur Auswahl; keine Implementierung.

## Aktuelle neue Designrichtungen

**Verbindliche Nutzerkorrektur:** Das bisherige Top-Menü ist wichtig und bleibt erhalten: Wortmarke/Bestandslogo links, zentrale kompakte Icon-Navigation für Freigaben, Kurzlinks, Statistik und Einstellungen, Kontozugang rechts. Keine linke oder untere App-Navigation. Kompakte Bedienung und Icon first bleiben gesetzt. Die in früheren Entwürfen erkundete Navigationslage ist damit keine offene Entscheidung mehr.

Aktuelle drei Auswahlbilder im Gespräch, in dieser Reihenfolge:

1. `04-light-list-top-menu.png`: kühle helle Oberfläche, flache kompakte Liste, dezenter blauer Akzent; ehemalige linke Icon-Leiste entfernt.
2. `05-night-browser-top-menu.png`: dunkle geteilte Arbeitsfläche, Freigabenauswahl links und zugehörige Inhalte rechts; zentrale Icon-Navigation im Kopf. Die linke Inhaltsliste enthält keine App-Navigation.
3. `06-object-shelf-top-menu.png`: helle kompakte Freigabekacheln mit salbeigrünem Akzent und zentraler Icon-Navigation.

Die Dateien ohne `-top-menu` dokumentieren nur den vorausgehenden Stand der neuen Auswahl. Farben und Inhaltsmodelle bleiben Vorschläge; Auswahlmarkierungen, Dateieinsicht und Kachelansicht sind keine beschlossenen neuen Funktionen. Bei Auswahl müssen Datenbedarf, Mobilverhalten, Zugriffsschutz, Tooltips, Fokus und Kontraste konkret ausgearbeitet werden. Beispielzahlen, Ablauf und Schalterstellungen sind illustrativ. Die automatisch erzeugten Bilder zeigen keine geprüfte App und sind kein maßgenauer Implementierungsauftrag. Bestandslogo und vorhandenes mobiles Navigationsverhalten bei späterer Umsetzung berücksichtigen. Das produktive Frontend bleibt unverändert.

## Frühere Entwürfe (verworfen)

## Gestaltungsprinzip

Das Icon liefert eine klare Rangfolge: eine dominante Kontur, eine zurückhaltende zweite Ebene und präzise Zwischenräume. Im UI entsprechen dem primäre Aktionen und Namen, dezente Metadaten und klare Abstände zwischen Inhalt und Bedienung. Keine dekorativen M- oder S-Formen im Hintergrund und kein neues Logo.

- Palette: Graphit `#2b2d33`, warmes Hell `#e6e2db`, sekundäre Töne `#606268` und `#b8b5af`. Letztere dienen Flächen und grafischen Details; Text braucht auf seinem tatsächlichen Hintergrund separat geprüften Kontrast.
- Große Radien für die Navigationskapsel, kleinere einheitliche Radien für Felder, Schalter und Statuspillen. Nicht den 15/64-Iconradius pauschal auf jedes UI-Element skalieren.
- Flache Oberflächen und feine Trenner; Hierarchie durch Abstand und Schriftgewicht. Keine farbigen Hintergrundverläufe oder Karten je Listenzeile.
- Lucide-Symbole mit konsistenten Strichstärken. Systemschrift ohne externe Schriftabfragen. Normale Inhalte 14–16 px, sekundäre Angaben zurückgenommen und lesbar.

## Verdichtung: Icon first

Nutzerkorrektur: kompakter und näher am bestehenden Icon-first-Ansatz. Die kompakten Vergleichsentwürfe sind `01-warm-paper-compact.png`, `02-graphite-compact.png` und `03-two-tone-workspace-compact.png`; die ursprünglichen Bilder dokumentieren nur den vorherigen Stand.

- Navigation, Kontozugang und Zeilenaktionen über Lucide-Symbole; zugängliche Namen und Tooltips bei Hover/Fokus sind bei einer Umsetzung erforderlich. Tooltiptexte sind in den Bildern nicht dargestellt.
- Suche zunächst als Symbol, erst bei Bedarf als Eingabefeld. Überschrift, Suche, kompakter Statusfilter und Erstellen-Aktion in einer Zeile.
- Desktop-Zielwerte: Kopfbereich etwa 64 px, Listenzeilen etwa 48 px, Icons 16–18 px, normale Zeilenaktionen mit etwa 32–36 px Bedienfläche. Touchziele mindestens etwa 44 px. Dies sind vorgeschlagene Umsetzungswerte, keine aus den generierten Bildern gemessenen Maße.
- Kurzname zuerst; kurze sekundäre Beschreibung inline und bei Platzmangel gekürzt. Keine obligatorische zweite Textzeile.
- Ereignisse und Restzeit als Symbol plus Wert in dezenten Pillen; präzise Bedeutung „Downloadstarts“ beziehungsweise „Weiterleitungen“ als zugängliche Beschriftung und Tooltip. Keine redundante Aktiv/Inaktiv-Plakette neben dem Schalter.
- Selbsterklärende Namen und wichtige Hinweise nicht durch Symbole ersetzen: dynamische Freigaben, Passwortfehler und Downloadzustände benötigen weiterhin verständliche Texte.
- Bestehendes Produktlogo bei Umsetzung erhalten; die generierten Bilder nutzen lediglich die Wortmarke.

## Frühere technischere helle Variante (verworfen)

Der Nutzer bevorzugte zunächst die erste kompakte helle Richtung und wünschte sie „technokratischer“; diese Richtung ist inzwischen verworfen. `01-warm-paper-technical.png` verfeinert deshalb gezielt diese Basis; keine neue Dreierauswahl.

- Strengeres Raster und fest ausgerichtete Werte-/Aktionsbereiche; feine Zeilentrenner, flache Oberflächen.
- Kleinere vorgeschlagene Radien: etwa 4 px für Kontrollen, 6 px für die kompakte Navigationsgruppe, 3 px für Metadatenflächen. Erkennbare Schalter bleiben gerundet.
- Monospace für technische Kurznamen und Zahlenwerte, normale Sans-Serif für Beschreibungen und übriges UI. Schrift muss bei Umsetzung lokal verfügbar beziehungsweise mit passender Lizenz selbst gehostet sein.
- Weiterhin warme neutrale Farben, kompakte Zeilen, reine Icon-Navigation und Icon-Aktionen; keine zusätzlichen Beschriftungen oder dekorativen Systemanzeigen.
- Eine sehr dezente Zeilenhervorhebung mit linker Kante illustriert einen möglichen Interaktionszustand; kein neues Selektionsmodell beschlossen.
- Ziel sind gleichmäßige flache Füllungen ohne Verlauf oder Schatten. Der generierte Entwurf ist kein verbindlicher Pixel-/Kontrastnachweis; Freigabe dieser Verfeinerung und Ausarbeitung weiterer Ansichten stehen aus.

## Drei ursprüngliche Richtungen

1. `01-warm-paper.png`: durchgehend helle, warme Arbeitsfläche; dunkle Hauptaktionen, ruhige flache Liste. Geringster struktureller Abstand zur vorhandenen App.
2. `02-graphite.png`: durchgehende Graphitoberfläche, warme aktive Kontrollen; Details entfalten sich unter der ausgewählten Zeile.
3. `03-two-tone-workspace.png`: dunkler Kopf über hellem Inhalt; Liste und kontextbezogene Detailansicht nebeneinander. Die Detailspalte wäre eine neue Interaktionsentscheidung, noch nicht beschlossen.

Diese Richtungen variieren Flächenaufteilung und Informationshierarchie. Hell-/Dunkelmodus muss für die gewählte Richtung anschließend konsistent ausgearbeitet werden; die ersten beiden Bilder sind keine vollständig ausgearbeiteten Theme-Pendants.

## Übertragung auf die App

**App-Shell:** Wortmarke und bestehendes ShareLyze-Zeichen, zentrale Navigationskapsel und Kontomenü. Aktive Navigation nutzt den stärksten Kontrast. Kein zusätzliches Seitenmenü auf dem Desktop. Bestehende MediaLyze-Komponenten und Herkunftshinweise bei einer späteren Umsetzung berücksichtigen.

**Datenfreigabe und Kurzlinks:** identischer kompakter Aufbau mit Überschrift, Suche/Status und Erstellen-Aktion. Kurzname zuerst, Beschreibung beziehungsweise Zieladresse klein und kürzbar. Rechts dezente Ereignis-/Ablaufangaben, Schalter und Aktionen. Keine redundanten Spaltenüberschriften. Keine Ablaufpille bei unbegrenzten Freigaben. Bezeichnung der Statistik entsprechend der tatsächlichen Semantik „Downloadstarts“ beziehungsweise „Weiterleitungen“.

**Erstellen/Bearbeiten:** bestehende Dateiauswahl und kompakte Felder übernehmen. Quelle und Upload-Speicher klar erkennbar, dynamische Ordner verständlich erklären. Passwort/Ablauf als optionale Einstellungen gruppieren. Keine Downloadlimits. Änderungen als Vorschlag nicht automatisch in einen neuen Dialogablauf überführen.

**Statistik:** neutrale Typografie und sparsame grafische Akzente; Zeitraum und Ereignistyp klar vor den Werten. Keine Personen- oder Erfolgsaussagen aus Request-Zählungen ableiten. Diagramme erst mit echtem Datenmodell konkretisieren.

**Einstellungen:** thematische Abschnitte auf einer ruhigen Fläche, kompakte Felder, Beschreibungen nur bei erklärungsbedürftigen Entscheidungen. Öffentliche Linkadresse und Admin-Sicherheitsursprung fachlich getrennt behandeln.

**Öffentliche Downloadseite:** dieselbe Farb- und Kontursprache ohne Adminnavigation. Freigabename, Beschreibung und Dateiliste stehen im Mittelpunkt; Einzel- und ZIP-Download klar unterscheiden. Passwort-/Ablauf-/Fehlerzustände verständlich zeigen; keine internen Speicherpfade ausgeben.

**Mobil:** Listen auf eine kompakte Identitätszeile mit nachfolgender Metadaten-/Aktionszeile umordnen. Bestehenden mobilen Menüzugang berücksichtigen; bei Richtung 3 Detailansicht in den Inhaltsfluss oder eine gesondert ausgearbeitete Ansicht überführen. Mindestens etwa 44 px große Touchziele, sichtbare Fokuszustände und zugängliche Aktionsnamen vorsehen. Bewegung nur für nachvollziehbare Zustandswechsel, mit `prefers-reduced-motion` deaktivierbar.

## Prüfgrenzen

Auch in der kompakten dunklen Variante ist der generierte Filterzähler „274“ kein korrekt bestätigter Freigabenzähler; alle Beispielzahlen bleiben illustrativ. Die Bilder sind generierte visuelle Entwürfe mit Beispieldaten, keine Screenshots einer implementierten App. Abweichungen wie interne Beispielpfade in Bild 1, verkürzte Statistikbezeichnungen in Bild 2, dekorative Datumsangaben und doppelte Statussignale sind nicht zur Übernahme vorgesehen. Exakte Abstände, Kontraste, Fokus, Touchbedienung und Responsive-Verhalten sind noch nicht validiert. Produktives Frontend unverändert.

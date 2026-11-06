# Erweiterte Aufrufstatistiken

Neue Ereignisse erhalten eine Momentaufnahme in SQLite. Aufbewahrung und automatische Löschung gelten für das gesamte Ereignis. Alte IP-/User-Agent-/Referrer-Daten bleiben erhalten; fehlende historische Angaben werden nicht erfunden.

## Erfasste Daten

- Zeit, Ereignistyp, Link, Freigabe und gegebenenfalls Datei.
- Normalisierte IPv4/IPv6, Adressbereich, Verbindungs-IP und ausschließlich die gemäß TRUSTED_PROXIES akzeptierte Proxykette. Keine ungeprüften Forwarded-/GeoIP-Header als Standortquelle.
- Browser/Version, Betriebssystem/Version, Geräteklasse, Hersteller/Modell, CPU-Architektur, Engine/Version; originaler User-Agent bis 1024 Zeichen. Desktop ist ohne explizite Geräteklasse nur aus erkanntem Browser und OS abgeleitet.
- Bot-/KI-Crawler-/Assistent-Hinweise. Keine zuverlässige Personen-/Betrugserkennung.
- Vorhandene Client Hints, Sprache, HTTP-Version/Protokoll/Methode, Request-Pfad ohne Query, Range sowie Fetch-/Prefetch-Kontext.
- Herkunfts-Origin ohne Pfad/Query/Zugangsdaten. Keine Cookies, Authorization-Header, Passwörter, Request-Bodys oder beliebigen zusätzlichen Header speichern.
- Nach GeoIP-Installation: ungefährer Kontinent, Land/Ländercode, Region, Stadt, Koordinaten und Datenstand. Zeitzone, PLZ und Genauigkeitsradius nur, wenn tatsächlich geliefert; DB-IP Lite liefert diese nicht generell.
- Nach ASN-Installation: AS-Nummer, Netzorganisation und Datenstand. Das ist nicht zwingend der Anschlussvertragspartner. VPN/Mobilfunk/Proxys können einen abweichenden Netzstandort zeigen.

Accept-CH fordert Angaben auf öffentlichen Routen an. Verfügbarkeit und Genauigkeit entscheidet der Browser; hochauflösende Angaben sind typischerweise erst nach einer HTTPS-Antwort verfügbar. Kein Critical-CH-Replay, Besucher-Cookie, GPS oder clientseitiger Fingerprint. Keine MAC-Adresse oder Identität aus IP-Daten ableiten.

## Ereignisbedeutung

| Typ | Bedeutung |
| --- | --- |
| redirect | Erfolgreiche externe Weiterleitung |
| link_view | Passwortseite eines geschützten externen Kurzlinks |
| share_redirect | Kurzlink leitet zur Freigabeseite weiter |
| landing | Freigabe-HTML geladen; im Betrieb mit ausgeliefertem Frontend auch ohne JavaScript |
| view | Öffentliche Freigaben-API, auch für noch gesperrte Freigaben |
| unlock_failed | Abgewiesener Passwortversuch |
| download_start / transfer_finished | Downloadstart / serverseitiger Abschluss |
| zip_start / zip_finished | ZIP-Start / serverseitiger Abschluss |

Eine Navigation kann mehrere getrennt benannte Ereignisse auslösen. Keine scheinbaren eindeutigen Personen daraus ableiten. HEAD, Range, Bots, Vorladen und wiederholte Anfragen bleiben am Ereignis nachvollziehbar. Nicht existierende/deaktivierte Links, Admin-Aktionen, Vorschauen und beliebige HTTP-Fehler zählen nicht pauschal als Linkaufruf. Ein Serverabschluss beweist kein Speichern beim Empfänger.

## Standortdaten einrichten

Unter Einstellungen → Standort und Netzanbieter einmal „Standortdaten installieren“ wählen. Der Server lädt die aktuelle Monatsausgabe von [DB-IP City Lite](https://db-ip.com/db/download/ip-to-city-lite) und [ASN Lite](https://db-ip.com/db/download/ip-to-asn-lite), ohne API-Schlüssel und ohne Besucher-IP-/Ereignisversand. Alle Lookups erfolgen lokal.

Dateien: /data/config/geoip/city.mmdb und asn.mmdb beziehungsweise CONFIG_ROOT/geoip. Kein zusätzlicher Mount nötig. Daten unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); Seiten mit Ergebnissen zeigen den vorgeschriebenen [DB-IP-Herkunftslink](https://db-ip.com/). [Upstream-Lizenz und Downloadübersicht](https://db-ip.com/db/lite.php).

Downloads sind auf feste HTTPS-Monatsdateien begrenzt, ohne URL-Eingabe/Weiterleitungen, mit Zeit-/Größenlimits. MMDB-Leser und Datenbanktyp validieren jede Datei vor atomarem Ersatz. Defekte Downloads ersetzen keine gültige Vorgängerdatei; Teilfehler können zu unterschiedlichen City-/ASN-Datenständen führen.

Erstinstallation per Schaltfläche; danach monatliche Aktualisierung bei der stündlichen Wartung, einmal je laufender Instanz/Monat. Fehlgeschlagene Updates manuell erneut starten. Die Anwendung bleibt ohne GeoIP nutzbar. Private, reservierte und ungültige IPs erhalten keinen öffentlichen Standort. Alte Ereignis-Momentaufnahmen werden nicht nachträglich verändert.

Datenbanken benötigen derzeit grob 130 MB zuzüglich temporärer Dateien. Für den speicherbasierten MMDB-Leser und Updates ausreichend RAM vorsehen; tatsächliche Größen hängen von der Monatsausgabe ab.

## Auswertung

Filter auf Link, Ereignis, UTC-Datum, Traffic und Suchbegriff. Aggregationen erfolgen auf der vollständigen Auswahl, bevor Top-Listen begrenzt werden: zehn Werte je Dimension, 100 Dateien und 730 Tages-/Ereignisgruppen. Einzelabrufe in 50er-ID-Cursorseiten statt der bisherigen globalen 200-Ereignis-Grenze.

„Ohne erkannte Bots / Vorladen“ bedeutet nicht nachgewiesene Menschen und schließt historische Ereignisse ohne Zusatzdaten aus. „Alle“ enthält auch diese. Datumsgrenzen sind UTC-Tage; Einzelzeitpunkte verwenden die eingestellte Darstellungsregion.

Geschützter JSONL-Export mit denselben Filtern, einer oberen Ereignis-ID als Startgrenze, begrenzten Leseblöcken und Backpressure. Neue Ereignisse werden nicht unkontrolliert angehängt; reguläre Aufbewahrung bleibt wirksam. Endpunkte erfordern die Admin-Anmeldung:
- /api/analytics/report und /api/analytics/events: slug, type, from, to, traffic, q; events zusätzlich cursor.
- /api/analytics/export: dieselben Filter, gestreamter JSONL-Download.
- GET /api/geoip und POST /api/geoip/update: Status und Installation/Aktualisierung.

## Herkunft und Prüfungen

UAParser.js 2 (Faisal Salman, AGPLv3), maxmind (Dmitry Shirokov, MIT, mit mmdb-lib) und ipaddr.js (whitequark, MIT). Originalhinweise und Lizenztexte verbleiben in den ausgelieferten npm-Paketen. Keine UA-/GeoIP-Web-API.

API-Tests prüfen Snapshot, Proxyvertrauen, weggelassene Geheimnisse, Client Hints, Bots, Filter/Aggregationen/Pagination, Exportschutz und Schema-13→14-Erhalt. Der Befehl node --import tsx scripts/verify-geoip.mjs verwendet kleine öffentliche MaxMind-Testfixtures für echte MMDB-Lookups und einen kontrollierten Transport für gzip-Installation, Neustart und Defekterhalt. Fixtures werden temporär geladen und entfernt; kein vollständiger DB-IP-Monatsdownload in dieser Prüfung.

## Kumulierte Statistikoberfläche

Die Statistikseite startet mit 90 Tagen und kombiniert Freigabeansichten, Downloadstarts und Serverabschlüsse. Weiterleitungen und ZIP-Ereignisse werden bei vorhandenen Werten getrennt angeboten. Kurven sind einzeln schaltbar und summieren ausschließlich seit Beginn der Auswahl; fehlende Zeitintervalle enthalten null Ereignisse. Zeitraumwechsel (90/30/7 Tage, Datum, eigener Zeitraum bis 366 Tage) und Link-/Traffic-/Suchfilter aktualisieren Graph und ergänzende Auswertungen.

Ein gewählter Graphpunkt filtert das Log auf genau diesen UTC-Tag, diese Stunde oder Minute. Der Ereignistypfilter betrifft nur das Log; dessen JSONL-Export übernimmt auch die Zeitpunktauswahl. Aufklappbare Einträge zeigen vorhandene Momentaufnahmen inklusive Request-, GeoIP-, Geräte- und optionaler Telemetriedaten. Die Zeitachse verwendet UTC; Einzelzeitpunkte bleiben nach den Region-/Zeitformat-Einstellungen formatiert.

`GET /api/analytics/timeline` erfordert dieselbe Admin-Anmeldung und Filter wie report sowie `from`/`to` und optional `resolution=day|hour|minute`. Es liefert `{from,to,resolution,rows:[{bucket,type,count}]}`, ISO-UTC-Zeitgrenzen mit exklusivem `to`. Maximal 366 Tage, für hour/minute höchstens ein Tag. Keine Begrenzung auf 730 Gruppen; die bisherigen report.daily-Werte bleiben aus Kompatibilitätsgründen separat bestehen. `since` und `until` ergänzen die gemeinsamen Filter als strikte ISO-UTC-Zeitstempel mit Millisekunden: inklusive Start-/exklusive Endgrenze.

„Live“ ist eine echte Aktualisierung alle 30 Sekunden für den heutigen UTC-Tag mit Minutenintervallen, kein Ereignisstream. Pausieren und manuelles Aktualisieren möglich; im Hintergrundtab kein Polling. Für ältere Daten oder fehlende Zusatzangaben werden keine Werte rekonstruiert.

## Übertragungsqualität, Browserkontext und Kampagnen (Schema 15)

### Messungen und Fehlerlog

Dateidownloads und ZIPs erhalten je Versuch eine zufällige Übertragungskennung sowie Start- und genau ein abschließendes Ereignis. Das Ergebnis ist abgeschlossen, abgebrochen oder fehlgeschlagen. Auch Vorschau-/Medienantworten werden abschließend gemessen; sie zählen weiterhin nicht als Dateidownloads.

Gespeichert werden Nutzdatenbytes im Server-Ausgabestream, erwartete Bytes soweit bekannt, Dauer vom Eintritt in den Ressourcenhandler bis Serverabschluss/Verbindungsende, mittlere Bytes pro Sekunde, HTTP-Status, Dateiendung und Range-Anforderung/-Annahme. Die Dauer enthält Vorbereitung und serverseitiges Warten; es ist keine reine Leitungsgeschwindigkeitsmessung. Bei Abbrüchen können gezählte Bytes noch Pufferanteile enthalten. Serverabschluss und Bytes sind kein Empfangs-/Speichernachweis. Teilbereiche/ZIPs werden nicht zur angeblich eindeutigen Originaldateigröße aufsummiert.

Erneute Anfragen derselben Ressource nach einem dokumentierten Abbruch/Fehler innerhalb derselben kurzlebigen Besuchszuordnung werden als retry_attempt mit Verweis auf die vorherige Übertragungskennung erfasst. Das ist eine Wiederholung, kein Beweis eines automatisch fortgesetzten Downloads. Nach einem erfolgreichen letzten Versuch wird keine alte Fehlermeldung weiter als Vorgänger verwendet.

Range-Anfragen erzeugen ein eigenes Range-/Wiederaufnahmeversuch-Ereignis. Ein Bereich ist kein Beweis eines Wiederaufnahmeversuchs: Clients können Inhalte auch in Teilen abrufen. Medien-Range-Anfragen gelten nicht als Dateiwiederaufnahme. Der Rückfall auf eine volle Antwort bei unpassendem/nicht unterstütztem If-Range ist am Status, rangeAccepted und rangeFallback sichtbar. ZIPs bleiben nicht fortsetzbar.

Fehler-/Abbruchereignisse enthalten einen festen Fehlercode, die beobachtete Situation, mögliche Gründe und bei vorhandenen Systemfehlern einen begrenzten Fehlercode wie EACCES/EIO. Keine ungefilterten Fehlermeldungen, Stacks oder absoluten Speicherpfade speichern. Unterschieden werden unter anderem Datei-/Mount-/Rechteprobleme, geänderte Quelldateien, Range-Fehler, Kapazitätsgrenzen, Vorschau-/Format-/Sicherheitslimits und Verbindungsende. Eine geschlossene Verbindung kann Nutzerabbruch, Netzproblem oder Proxy-Timeout bedeuten; die Ursache wird nicht als sicher behauptet. Ein Prozessabsturz kann kein abschließendes Ereignis erzeugen; ein Start ohne Ergebnis darf nicht als Erfolg oder als sicher diagnostizierter Nutzerabbruch interpretiert werden.

Die Oberfläche zeigt Gruppen nach Art/Ergebnis mit Bytes, summierter Dauer und Datenrate (Summe Bytes / Summe Dauer). Einzelereignisse enthalten Kennung und Diagnose. Fehler werden nach Ereigniscode, Geräteklasse, Betriebssystem, Browser, Netzorganisation und Dateiendung aufgeschlüsselt. Browser- und Servermeldungen zum selben Problem bleiben getrennte Meldungen, keine garantierte Zahl eindeutiger Vorfälle.

### Browserkontext und Leistungsdaten

Die öffentliche Freigabe-API stellt eine zufällige, auf diesen Link beschränkte Kennung für maximal acht Stunden aus. Nur ihr Hash wird in public_visits gespeichert. Die Kennung ist kein Inhaltszugang: Passwort-/Freigabeprüfungen gelten zusätzlich. Sie reist in einem Header oder bei nativen Downloads/Medien als visit-Parameter; es gibt kein dauerhaftes Besucher-Cookie. Ereignisse speichern nur eine unabhängige Zuordnungs-ID, nicht den Token. Abgelaufene Hilfsdatensätze werden beim Start/stündlich und bei neuen Besuchen entfernt, beim Löschen der Freigabe sofort.

Die öffentliche Seite meldet Browser-Zeitzone, UTC-Zeitversatz (Date.getTimezoneOffset-Konvention), Touch-Punkte (null bei nicht unterstützter Angabe), angewendetes Hell-/Dunkelschema und Ansicht. Die erste Ansicht wird nach Eingang einmal um klar bezeichnete Clientangaben ergänzt; passive Daten und Standort werden nicht neu interpretiert. Bewusste Ansichtswechsel haben einen eigenen Ereignistyp. Eine initiale Standardansicht gilt nicht als bewusste Vorliebe. Touch bedeutet nicht automatisch Smartphone; Werte stehen neben OS/Geräteschätzung. Region, IP und Browser-Zeitzone werden gemeinsam dargestellt und bleiben unterschiedliche Informationsquellen.

Performance Navigation/Resource Timing liefert nach Verfügbarkeit Seitenladezeit, DOM-Bereitschaft, TTFB und Ressourcenzeit/-größe/-status. Nicht verfügbare TTFB wird ausgelassen statt als echte Nullzeit ausgegeben. Öffentliche API-Handler und Ressourcen liefern separat Serverdauern. Der Ressourcenbeobachter erfasst nur eigene Freigabe-Endpunkte, keine beliebigen Drittseiten. Bild-/Videodarstellungsfehler werden mit festem Browserfehlercode gemeldet, ohne rohe Fehlermeldungen. Messungen können durch Browser, Abbruch, Blockierung oder Schutzmechanismen fehlen. Die Seite ist auch ohne Telemetrie benutzbar.

Meldungen sind pro Besuch auf 200 serverseitig und 150 clientseitig begrenzt; hinzu kommt die bestehende Ratebegrenzung. Kontextfelder, Ressourcenzuordnung und Zeit-/Größenwerte werden serverseitig validiert. Clientangaben bleiben ungeprüfte Selbstauskünfte. Bei unmittelbar extern weiterleitenden Kurzlinks läuft keine ShareLyze-Seite: dort bleiben JavaScript-only-Angaben wie Browser-Zeitzone unbekannt. Das externe Ziel wird nicht zum Erfassen dieser Angaben verzögert.

### Kampagnen und eigene QR-Codes

Nur utm_source, utm_medium, utm_campaign, utm_content und utm_term werden aus der URL übernommen, je höchstens 100 Zeichen und ohne Steuerzeichen. Beliebige Querys, Passwörter und Tokens werden weiterhin nicht gespeichert. Beim Sprung zur Freigabe und über Passwortformulare bleiben nur diese erlaubten Kennzeichnungen erhalten; zusätzliche Ereignisse des Freigabeaufrufs übernehmen sie aus der Besuchszuordnung. Bei externen Zielen bleibt deren konfigurierte URL unverändert.

Die Statistik bietet einen Generator für einen vorhandenen Link mit Quelle, Medium, Kampagne und Variante, inklusive lokal erzeugtem QR-Code als PNG. Beispiel: Quelle einladung, Medium qr, Kampagne sommerfest, Variante karte. Die Kennzeichnungen stehen öffentlich in der URL; keine Geheimnisse eintragen. Der Generator nutzt die konfigurierte öffentliche Linkadresse und keine externe QR-Code-API (qrcode, MIT).

Kampagnenvergleich: Freigabeansichten/externe Weiterleitungen, Datei-/ZIP-Starts und Serverabschlüsse je Quelle/Medium/Kampagne/Variante. Downloadstarts können pro Aufruf mehrfach vorkommen; daraus keine eindeutige Conversion ableiten. Filter auf Quelle/Medium/Kampagne gelten auch für Verlauf, Log und Export. Ein QR-Aufruf ist ein Aufruf einer als qr gekennzeichneten URL, kein Beweis eines physischen Scans oder einer bestimmten Person.

### Heatmap und Genauigkeitsgrenzen

Die 7×24-Heatmap zeigt Wochentag und Stunde in UTC mit sichtbaren Nullwerten und tabellarisch zugänglichen Zahlen. Standardmäßig zählt sie Freigabeansichten und externe Weiterleitungen; technische Ereignisse können separat eingeblendet werden, damit viele Ressourcenmessungen nicht als Beliebtheit einer Freigabe erscheinen. Uhrzeit-/Datumsfilter bleiben UTC; Browser-Zeitzonen werden daneben separat ausgewertet.

Neue Daten gelten ab dieser Implementierung. Alte Ereignisse erhalten keine erfundenen Dauer-, Kontext- oder Fehlermessungen. Bestandsereignisse bleiben über Schema 15 erhalten. Die bisherigen API-, Aufbewahrungs-, Quellen- und Sicherheitsgrenzen gelten weiter.

Der Aktivitätskalender „Tage, an denen etwas passiert ist“ verwendet dieselbe gefilterte Zeitreihe. Stunden-/Minutenwerte werden nach UTC-Tag summiert. Die Zahl im Tag zählt alle Ereignisse, Farbmarkierungen die vorhandenen Ereignisarten (zusätzliche Arten gemeinsam als „Weitere Ereignisse“). Monatsnavigation bleibt innerhalb des Zeitraums. Ein Kalenderklick filtert Log und Export immer auf den ganzen UTC-Tag, auch wenn der Graph gerade Stunden oder Minuten zeigt. Außerhalb des Zeitraums liegende Tage sind deaktiviert; Nulltage bleiben auswählbar.

# ShareLyze – Projektziel und MVP-Plan

Stand: 2. November 2026. Dieses Dokument hält die bisher besprochenen Entscheidungen fest und ist ein Ausgangspunkt für nachfolgende Entwicklungsagents. Es beschreibt das Zielbild; den tatsächlichen Stand hält der Abschnitt „Umsetzungsstand“ fest.

## Produktziel

ShareLyze ist eine schlanke, vollständig selbst gehostete Open-Source-Anwendung für Dateifreigaben und Kurzlinks. Bestehende Dateien auf einem NAS sollen ohne Upload und ohne vollständige Kopie öffentlich freigegeben werden können. Empfänger erhalten eine übersichtliche Downloadseite, keinen allgemeinen Dateimanager. Administratoren verwalten Freigaben, Kurzlinks und grundlegende Statistiken in einer gemeinsamen Oberfläche.

> Share files directly from your storage. No duplicates. Just links.

Zielplattform ist unter anderem ein UGREEN NAS mit Docker Compose und Reverse Proxy, beispielsweise Zoraxy. Andere geeignete Reverse Proxys sollen ebenfalls unterstützt werden.

## Herkunft und Lizenz

- **Eigenständige Neuimplementierung**, kein Fork von SelfDrop und keine Übernahme von SelfDrop-Code, CSS, Assets oder anderen Projektbestandteilen. SelfDrop darf als Beispiel für Funktionen und technische Ansätze untersucht werden; daraus folgt keine Erlaubnis, Ausdrucksformen zu kopieren. Frühere Fork-Empfehlungen sind überholt.
- ShareLyze verwendet vorläufig **AGPL-3.0-only** (`LICENSE`, `package.json`); eine zusätzliche „or later“-Erlaubnis wurde nicht angenommen.
- MediaLyze ist die gewünschte Design- und CI-Referenz. Bei gezielter Übernahme von MediaLyze-Bestandteilen deren Herkunft, geltende Lizenz- und Urheberhinweise sowie die Lizenzen von Abhängigkeiten und Assets berücksichtigen. Keine implizite Annahme, dass alle Drittbestandteile dieselbe Lizenz haben.
- Ein SelfDrop-Verweis ist kein Produktziel; die hier dokumentierte Herkunftsentscheidung soll Agents helfen, die Grenze der Wiederverwendung zu verstehen.

## Vereinbarter Umfang für Version 0.1

### Speicher und Freigaben

- Mehrere bestehende NAS-Verzeichnisse als getrennte Quellen einbinden. Erste Implementierung: Docker-Bind-Mounts, standardmäßig schreibgeschützt. Keine Schreiboperationen auf den Quelldateien.
- Einzeldateien, mehrere ausgewählte Dateien und ganze Ordner freigeben; Auswahl kann mehrere Quellen umfassen.
- Ordner sind **dynamisch**: Neue, geänderte und gelöschte Inhalte wirken sich auf spätere Ansichten und Downloads aus. Beim Anlegen sichtbar erklären, dass zukünftig hinzugefügte Inhalte freigegeben werden.
- Einzeldateien referenzieren den ausgewählten Pfad. Ein Ersatz am selben Pfad kann daher als aktueller Inhalt erscheinen; keine historischen Dateiinhalte versprechen.
- Pro Freigabe öffentliche Downloadseite, Einzeldownload und ZIP-Download. Alle regulären Dateitypen müssen herunterladbar sein; Vorschauen sind nachrangig und keine Voraussetzung des MVP.
- Freigaben erstellen, anzeigen, bearbeiten und deaktivieren; optional Passwort und Ablaufdatum. **Keine Downloadlimits** oder darauf bezogene Einstellungen.
- Große Dateien und parallele Downloads von Anfang an unterstützen: Streaming mit begrenztem Speicherverbrauch und Backpressure, kontrollierter Umgang mit Abbruch und Ressourcen. Konkrete garantierte Größen und Parallelitätsziele sind noch nicht festgelegt und müssen gemessen werden.

### Download und ZIP-Semantik

- Einzeldateien über HTTP Range fortsetzbar bereitstellen, einschließlich korrekter Statuscodes und Header. Den Zugriff bei jedem Request erneut prüfen. Geeignete Validatoren und `If-Range` verwenden; wenn sich die Repräsentation geändert hat, keinen alten und neuen Inhalt zu einem scheinbar gültigen Download kombinieren. Metadatenbasierte Validatoren können Änderungen nicht in jedem Fall sicher erkennen; Grenzen dokumentieren und testen.
- Für einen ZIP-Download wird **zu Beginn eine feste Liste** der zu diesem Zeitpunkt ausgewählten Dateien ermittelt. Später hinzugefügte Dateien erscheinen beim nächsten Download. Die Liste ist kein Snapshot der Dateiinhalte.
- ZIP direkt aus den Quelldateien streamen, ohne vollständiges temporäres Archiv. Unterbrochene ZIP-Downloads beginnen im MVP erneut. Struktur und Dateinamen im Archiv erhalten, Kollisionen sicher und nachvollziehbar behandeln; Zip64 für große Archive berücksichtigen.
- Verschwindet eine gelistete Datei oder tritt ein Lesefehler auf, wird der ZIP-Stream abgebrochen und nicht als erfolgreich abgeschlossen gezählt. Nach bereits gesendeten HTTP-Headern ist keine neue reguläre Fehlerseite garantiert; Client-Abbruch und geeignete Nutzerkommunikation vorsehen. Änderungen während des Lesens soweit möglich erkennen, aber ohne Snapshot keine atomare Konsistenz zusichern.
- Dynamische Anpassung eines bereits laufenden ZIPs und vollständige Kopien der Daten sind nicht vereinbart. Dateisystem-Snapshots sind eine mögliche spätere, plattformabhängige Erweiterung.

### Kurzlinks

- Sowohl Links zu ShareLyze-Freigaben als auch eigenständige Weiterleitungen auf externe URLs verwalten.
- Für beide Typen zufällige oder benutzerdefinierte Slugs anbieten. Zufällige Slugs kryptografisch sicher erzeugen; eigene Slugs sind erratbar und kein Schutz für vertrauliche Inhalte.
- Eindeutigkeit und reservierte Systemrouten zentral durchsetzen. Externe Ziele für das MVP auf gültige HTTP- und HTTPS-URLs beschränken. Linkerstellung, Anzeige, Bearbeitung und Deaktivierung vorsehen.
- Öffentliche Basis-URL explizit konfigurieren; Betrieb mit eigener Domain oder Subdomain hinter verschiedenen Reverse Proxys ermöglichen.

### Analytics und Datenschutz

- Aufrufe pro Freigabe und Kurzlink sowie Downloads je Freigabe und Datei erfassen; zeitliche Auswertung ermöglichen. Für allgemeine Kurzlinks Weiterleitungen gesondert zählen.
- Ereignisse eindeutig definieren: Seitenaufruf, Weiterleitung, Downloadstart und soweit beobachtbar serverseitig abgeschlossene Übertragung. Letzteres beweist nicht, dass der Empfänger eine Datei gespeichert oder geöffnet hat. Range-Requests, Wiederaufnahmen, Bots und wiederholte Anfragen nicht als eindeutige Personen ausgeben.
- Ein ZIP-Abschluss ist zunächst ein Ereignis für das Archiv; daraus nicht automatisch abgeschlossene Einzeldownloads jeder enthaltenen Datei ableiten.
- Keine externen Tracker oder Besucher-Tracking-Cookies. Auf Nutzerwunsch werden IP-Adresse, User-Agent und die Herkunfts-Domain pro Ereignis gespeichert; Aufbewahrung konfigurierbar und automatische Bereinigung. Protokolle von App und Reverse Proxy gesondert betrachten.
- Standortermittlung benötigt eine zusätzliche Geo-IP-Datenquelle und ist noch offen. Geräte- und Browserinformationen stammen aus dem ungeprüften User-Agent. Standard-Aufbewahrung: 30 Tage.

### Oberflächen und Design

- Admin-Dashboard mit Quellen-/Dateiauswahl, Freigabe- und Kurzlinkverwaltung, Status, Suche und grundlegenden Statistiken. Öffentliche, responsive und leicht verständliche Downloadseite.
- Gemeinsame Bildsprache mit MediaLyze: App-Shell und Navigationsmuster für Admin, Typografie, Farben, Bedienelemente, Hell-/Dunkelmodus und passende Zustände. Öffentliche Downloadseite bleibt auf Empfänger und Download konzentriert.
- Referenzen im lokalen MediaLyze-Checkout: `frontend/globals.css`, `frontend/src/medialyze.css`, `frontend/src/components/AppShell.tsx` und `frontend/src/pages/UiElementsPage.tsx`. Gezielt notwendige Bausteine und Styles prüfen statt automatisch alle MediaLyze-spezifischen Regeln zu übernehmen.
- Responsivität, Tastaturbedienung, Fokuszustände, verständliche Fehler und zugängliche Beschriftungen berücksichtigen. Externe Schriftladevorgänge und Font-Lizenzen im Self-hosting-Konzept prüfen.

## Architekturvorschlag

- **Frontend:** React, TypeScript/TSX, Vite.
- **Backend:** Node.js, TypeScript und Express; ein modularer Monolith mit separaten Bereichen für Authentifizierung, Speicherquellen, Freigaben, Links, Downloads und Analytics.
- **Datenbank:** SQLite für einen einzelnen App-Knoten, persistentes Volume, versionierte Migrationen und konsistentes Backup/Restore. Keine gemeinsam schreibenden Replikate voraussetzen.
- **Storage-Schnittstelle:** Quellen über stabile IDs und relative Pfade referenzieren; Operationen für Auflisten, Metadaten und Lesen. Zunächst nur lokale Bind-Mounts, später gegebenenfalls SMB, S3 oder WebDAV. Ein Interface erzwingt keine identische Semantik dieser Backends.
- **Dateiauslieferung:** im MVP kontrolliertes Streaming durch die Anwendung als Ausgangspunkt; Range, Backpressure, Abbruch, Zugriffskontrolle und beobachtbare Ereignisse durchgängig berücksichtigen. Optionales Proxy-Offloading nur nach gesonderter Messung und Sicherheitsprüfung.
- **Deployment:** Docker Compose mit lesenden Quellen und getrenntem persistentem App-Datenvolume. HTTPS über Reverse Proxy; öffentliche URL und vertrauenswürdige Proxys ausdrücklich konfigurieren.
- Gemeinsame API-Typen können zwischen Frontend und Backend geteilt werden; alle externen Eingaben müssen serverseitig zur Laufzeit validiert werden.

### Vorläufiges Datenmodell

| Entität | Inhalt |
| --- | --- |
| `storage_sources` | Stabile ID, Name, Backend-Typ, interne Konfiguration, Status |
| `shares` | ID, Titel, Status, Erstellungszeit, optional Ablauf und Passwort-Hash |
| `share_items` | Share-ID, Source-ID, relativer Pfad, Typ Datei/Ordner |
| `links` | Eindeutiger Slug, Zieltyp Freigabe oder externe URL, Ziel, Status und Zeitstempel |
| `analytics_events` | Zeitpunkt, Ereignistyp, Link-/Share-ID und gegebenenfalls sicher zugeordnete Datei |
| `daily_counters` | Optionale aggregierte Tageswerte für längerfristige Auswertung |
| `admin_sessions` | Widerrufbare Sitzungen, Ablauf und sichere Identifikatoren |

Das konkrete Schema, Löschregeln, Indexe, Slug-Normalisierung und die datensparsame Zuordnung einzelner Dateien in dynamischen Ordnern sind bei der Implementierung auszuarbeiten. Niemals interne Speicherpfade öffentlich ausgeben.

## Sicherheitsanforderungen

- Admin ist auch extern erreichbar: sichere Ersteinrichtung, starke Passwörter, widerrufbare und begrenzte Sitzungen, sichere Cookies, CSRF-Schutz und Rate-Limits für Login und Freigabepasswörter. Sichere HTTPS-Konfiguration dokumentieren.
- Eine zentrale Autorisierung für öffentliche Metadaten, Dateidownload, Range-Requests und ZIP: Status, Ablauf und Passwortschutz für jeden relevanten Pfad prüfen.
- Zugriff ausschließlich auf freigegebene Quellen und Inhalte; Traversal, absolute Pfade und Sonderdateien abweisen. Symbolische Links im MVP ablehnen. Auch Austauschrennen zwischen Prüfung und Öffnen berücksichtigen; robuste Linux-Dateideskriptor-basierte Verfahren evaluieren.
- Sicherheitsheader und sichere Content-Disposition; aktive Dateien nicht ungeschützt im Admin-Ursprung ausführen. Kein unnötiges Caching vertraulicher Daten und keine Geheimnisse oder Zugriffstokens in Logs.
- Vertraue Forwarded-Headern nur von konfigurierten vertrauenswürdigen Proxys. Ressourcen für parallele Streams und Archivierungen begrenzen, ohne fachliche Downloadlimits einzuführen.
- Keine Standard-Secrets für Produktion. Ausfälle von Quellen, unzureichende Leserechte und Fehler ohne Offenlegung interner Pfade behandeln.

## CI und Release

MediaLyzes `.github/workflows/build-docker.yaml` und `validate-release-pr.yaml` dienen als Vorlage für das Vorgehen: Dev- und Release-Kanal, GHCR, Images für `linux/amd64` und `linux/arm64`, Multi-Arch-Manifest, Release-Metadaten und Changelog. Für ShareLyze an dessen Versionierung, Repository und TypeScript-Stack anpassen; Desktop- und FFmpeg-spezifische Schritte sind nicht vorgesehen.

Zusätzlich PR-Checks für Installation über Lockfiles, TypeScript, relevante Frontend-/Backend-Tests und Docker-Build vorsehen. Zugriffsrechte der Workflows minimal halten und Veröffentlichung nur auf vorgesehenen Branches/Ereignissen ausführen. Die konkrete Release-Konfiguration und erforderliche Repository-Berechtigungen beim Einrichten überprüfen.

## Roadmap und Abnahme

1. **Projektgrundlage:** eigenständiges Repository-Gerüst, AGPL-Variante und Lizenzhinweise, TypeScript-Frontend und -Backend, Tests, Datenbankmigrationen und Docker-Entwicklung. Keine SelfDrop-Dateien übernehmen.
2. **Sicherheit und Quellen:** Admin-Setup und Sitzungen, Quellenkonfiguration, sichere Pfadauflösung und isolierte Dateiauswahl. Tests für unberechtigten Zugriff, Traversal, Symlinks, Sonderdateien und fehlende Quellen.
3. **Freigaben und Links:** dynamische Ordner, Einzeldateien, Bearbeitung/Deaktivierung, Passwort und Ablauf; zufällige und eigene Slugs für Freigaben und externe Weiterleitungen. Tests für Kollisionen, reservierte Routen und alle öffentlichen Autorisierungspfade.
4. **Downloads:** Streaming, HTTP Range und Validatoren für Einzeldateien; feste Dateiliste und ZIP-Streaming mit Zip64, Abbruch- und Fehlerbehandlung. Tests für Unterbrechung/Fortsetzung, geänderte Dateien, große Dateien und parallele Transfers.
5. **Analytics und Oberfläche:** datensparsame Ereignisse und Aufbewahrung, Admin-Liste und Details, MediaLyze-orientierte öffentliche Downloadseite. Echte Browserabläufe mit Testdaten und Tests für unterschiedliche Zustände.
6. **Deployment und Release:** Compose, Proxy-Beispiele einschließlich Zoraxy, Dokumentation zu Konfiguration und Backup/Restore; CI, Multi-Arch-Images und Releaseablauf. Tests hinter Proxy und auf Zielhardware, einschließlich Ressourcenmessung.

Ein MVP gilt erst als abgenommen, wenn Freigabe, Kurzlink, Zugriffsschutz, Einzel- und ZIP-Download sowie Analytics im tatsächlichen Ablauf mit isolierten Testdaten geprüft wurden. Große Dateien und Parallelität müssen praktisch getestet werden; konkrete Leistungszusagen erst nach vereinbarten Testwerten und Messungen machen.

## Offene Entscheidungen

- Lizenzvariante AGPL-3.0-only ist vorläufig gewählt; genaue Hinweise und Drittanbieter-Lizenzen bei konkreten MediaLyze-Übernahmen prüfen.
- Konkrete Testgrößen, Anzahl paralleler Downloads und akzeptabler Ressourcenverbrauch auf dem Ziel-NAS.
- Analytik-Aufbewahrungsdauer, Aggregation und Löschverhalten nach Entfernen einer Freigabe.
- Slug-Normalisierung, Wiedervergabe gelöschter Slugs und konkrete reservierte Routen.
- Handhabung von ZIP-Namenskollisionen, leeren Ordnern und sehr großen Dateilisten.
- Genaue Erstkonfiguration bei öffentlich erreichbarem Admin sowie Mechanismus für sichere Dateideskriptor-basierte Pfadauflösung auf Linux.
- Vorschauformate und weitere Storage-Backends nach dem MVP.

## Umsetzungsstand und Audit – 2. November 2026

**Funktionsumfang weitgehend vorhanden; MVP noch nicht vollständig abgenommen.** Für einen öffentlichen Produktiveinsatz fehlen die unten genannten Zielsystem-, Release- und umfassenden Sicherheits-/Barrierefreiheitsprüfungen.

Der Abschlussabgleich mit konkreten Auditbefunden, Korrekturen und Prüfgrenzen steht in [MVP_AUDIT.md](MVP_AUDIT.md).

### Implementiert

- MediaLyze-orientierter Kopfbereich mit großer Wortmarke, Versionsplakette, abgerundeter Navigationskapsel, hellem aktivem Symbol und Kontomenü zum Abmelden. Der Abstand zum Admin-Inhalt beträgt 10 px. Auf kleinen Bildschirmen ersetzt das ShareLyze-Symbol die Wortmarke. Die Navigation erscheint nur für angemeldete Administratoren; die bisherige Seitenleiste entfällt. Die aktuelle optische Angleichung wurde anhand der MediaLyze-Styles vorgenommen; ein erneuter visueller Browservergleich steht aus.
- Nach Nutzervergleich der beiden Header wurden Symbolbreite und -größe, Einstellungs-Zahnrad, Umrandung der aktiven Auswahl und Tooltips an MediaLyze angeglichen. Ein visueller Nachtest der Anpassung steht noch aus.
- Die aktive Markierung der Headernavigation gleitet beim Ansichtswechsel zum gewählten Symbol; bei aktivierter Systemeinstellung für reduzierte Bewegung entfällt die Animation. Ein visueller und interaktiver Nachtest steht noch aus.
- Die Überschrift der Freigabenansicht lautet „Datenfreigabe“.
- Freigabeübersicht mit Suche, Statusfiltern samt Zählern, Kurzname, Downloadstarts, Ablauf und Aktionen; auf schmalen Ansichten umbrechend. Downloadstarts umfassen auch Range-Anfragen und beziehen sich auf die Analytics-Aufbewahrungsdauer; Downloadlimits bleiben ausgeschlossen. Ein visueller und interaktiver Nachtest steht noch aus.
- Die Statusfilter verwenden ein zusammenhängendes Toggle-Menü nach MediaLyze-Vorbild; auf schmalen Ansichten ist die Leiste horizontal scrollbar.
- Die Kurzlinkübersicht nutzt denselben Aufbau mit Suche, Statusfiltern und Zählern, Zieladresse, Weiterleitungen und Aktionen. Weiterleitungen umfassen die erfassten Ereignisse innerhalb der Aufbewahrungsdauer; Kurzlinks besitzen derzeit kein Ablaufdatum. Ein visueller und interaktiver Nachtest steht aus.
- Lucide ist die Icon-Vorgabe; Animationen bei sinnvollem Einsatz unter Berücksichtigung reduzierter Bewegung und Drittanbieter-Lizenzen.
- Die äußeren Seitenabstände und die maximale Breite orientieren sich am MediaLyze-Layout (10 px oben, seitlich 8–24 px zuzüglich Safe Area, maximal 1500 px).
- Admin-Oberfläche mit eigenständigen Bereichen für Freigaben, Kurzlinks, Statistiken und Einstellungen, kompakteren Listen und innenliegenden Feldbeschriftungen. Die Dateiauswahl bietet Pfadnavigation und Mehrfachauswahl sichtbarer Einträge; pro Freigabe sind höchstens 500 direkt ausgewählte Elemente möglich. Ordner bleiben dynamisch.
- Die öffentliche Linkadresse lässt sich persistent in den Einstellungen ändern und wird für kopierte Links verwendet. Sie konfiguriert weder DNS noch Reverse Proxy oder den als Sicherheitsgrenze verwendeten Admin-Ursprung `PUBLIC_ORIGIN`; letzterer muss weiterhin separat zum tatsächlichen Admin-Aufruf passen. HTTPS ist erforderlich, HTTP nur für Loopback. SQLite-Migration 5 speichert diese Einstellung.
- Statistikseite mit Link- und Ereignisfilter, Tagesverlauf und Dateiübersicht. Die Dateiübersicht ist auf die 100 häufigsten Einträge über alle Links begrenzt; Filter zeigen nur Einträge innerhalb dieser Auswahl. Downloadstarts zählen auch Range-Anfragen und abgeschlossene Serverübertragungen belegen keine Speicherung beim Empfänger.
- Eigenständige TypeScript-Anwendung, SQLite-Migrationen, Admin-Ersteinrichtung mit Setup-Token, scrypt-Passwortprüfung, widerrufbare Sessions, Origin-Schutz und getrennte Rate-Limits für Setup, Login, Freigabe-Passwort und öffentliche Ordneransicht. Vertrauenswürdige Proxy-Adressen sind ausdrücklich zu konfigurieren; ohne sie teilen sich Clients hinter einem Proxy ein Limit.
- Mehrere Quellen über `SOURCES_JSON`, dynamische Ordner- und Dateifreigaben, Ablauf, Passwort, Bearbeiten/Deaktivieren sowie Freigabe- und externe Kurzlinks. Entfernte Quellen werden deaktiviert; ein von bestehenden Freigaben genutzter Quellenpfad darf nicht stillschweigend ersetzt werden.
- Linux-Dateizugriff über gehaltene Verzeichnis-Deskriptoren mit Symlink- und Sonderdatei-Abweisung. Ordneransichten begrenzen die eingelesenen Einträge auf 10.000 und öffentliche Ansichten sind gedrosselt. Größere Ordner benötigen später Pagination; sie werden derzeit abgelehnt.
- Datei-Streaming mit Range/If-Range, maximal 32 parallele Dateitransfers und drei ZIP-Streams. ZIPs nutzen eine feste Liste, keine vollständige Kopie und höchstens 10.000 Einträge/50 Ebenen. Metadaten werden vor und nach dem Lesen verglichen. Das ist keine atomare Momentaufnahme: Änderungen gleicher Metadaten oder bereits übermittelte Bytes können nicht garantiert erkannt oder zurückgenommen werden; für ZIPs ist Fortsetzen nicht vorgesehen.
- Ereignisse und Tageswerte je Link, Dateien und Freigaben mit konfigurierbarer Löschung nach standardmäßig 30 Tagen. Ereignisse sind keine eindeutigen Personen oder sichere Bestätigung, dass eine Datei beim Empfänger gespeichert wurde.
- Admin- und öffentliche Oberfläche mit Suche, Inline-Kurzlinkbearbeitung, responsivem Layout und systemgesteuertem Dark Mode. Beim Ersetzen von Freigabeinhalten wird die aktuell ausgewählte Liste angezeigt und eine Änderung der Auswahl hebt die Ersetzungsoption wieder auf. Visuelle Nähe zu MediaLyze und umfassende Barrierefreiheit sind noch nicht vollständig abgenommen.
- Docker/Compose, lokale Startskripte, CI mit Typecheck/Tests/Audit/Container-Last- und Integritätsprüfungen; Multi-Arch-Publishing für `dev`/`main` und versionierte Tags sowie taggebundene Release-Metadatenprüfung und GitHub-Release-Workflow. Release-Publishing und GitHub-Berechtigungen sind noch nicht live geprüft; `0.1.0` ist im Changelog weiterhin unveröffentlicht.
- Zusätzliche NAS-Compose-Vorlage `docker-compose.nas.yml` im MediaLyze-Stil mit externer Docker-Bridge, persistentem Konfigurations-Bind-Mount und zwei lesenden Beispielquellen. Der Container nutzt intern Port 3000; ein Upload-Verzeichnis ist nicht vorgesehen. Tatsächliche NAS-/Zoraxy-Prüfung bleibt offen.

### Nachweise

- NAS-Compose-Vorlage syntaktisch mit `docker compose config --quiet` geprüft und mit lokal gebautem Image, temporären Test-Bind-Mounts, isoliertem Docker-Netz und HTTP-Loopback gestartet: Auth-Status HTTP 200 und SQLite-Datei im Konfigurationsordner vorhanden. Dies prüft weder GHCR-Pull noch NAS-Berechtigungen, Zoraxy oder HTTPS.
- Isolierter Browserlauf für den neuen Kopfbereich: Einrichtung, Navigation zu Einstellungen, Kontomenü öffnen, Escape mit Rückkehr des Fokus und Abmelden. Bei 390 px Breite trat kein horizontaler Überlauf auf. Eine vollständige visuelle und Barrierefreiheitsprüfung bleibt offen.
- Isolierter Linux-Docker-Browserlauf für die neuen Bereiche: Linkadresse gespeichert und nach Neuladen wiedergefunden, zwei sichtbare Dateien ausgewählt, Freigabe erstellt, kopierte Adresse geprüft, Datei heruntergeladen und Statistik einschließlich Linkfilter aufgerufen. Statistikansicht bei 390 px ohne horizontalen Überlauf geprüft. Keine vollständige visuelle oder Barrierefreiheitsabnahme; die abschließende Listenverfeinerung wurde anschließend vorgenommen.
- Lokaler TypeScript-/Vite-Build, Produktions-Dependency-Audit ohne gemeldete Schwachstellen und automatisierte Tests erfolgreich. Auf macOS sind Linux-spezifische Tests übersprungen. Der aktuelle Lauf im Linux-Container besteht 23 Tests; zuvor liefen die Linux- und Symlink-Austauschtests auch im emulierten AMD64-Linux-Container.
- Isolierte Docker-Tests: 32 pausierte Downloads akzeptiert, die 33. Anfrage abgewiesen und Kapazität nach Trennung wieder frei; Dateiänderungen während Einzel- und ZIP-Stream wurden in einer Probe nicht als abgeschlossene Transfers gezählt. Die vollständige Empfangbarkeit bzw. atomare Konsistenz ist dadurch nicht garantiert.
- Zuvor vier parallele 64-MiB-Downloads mit SHA-256 verglichen; HEAD und die letzten Bytes einer sparsamen 4-GiB-plus-Datei über Range geprüft, keine vollständige 4-GiB-Übertragung. Keine garantierten Leistungswerte für echte NAS-Daten oder ZIPs dieser Größe.
- Docker-Compose-Start/Healthcheck in isoliertem Projekt; HTTPS-Proxytest mit Nginx; SQLite-Sicherung und Wiederherstellung in separates Docker-Volume einschließlich erneutem Login und wiederhergestelltem Kurzlink. Windows-Startskript, Zoraxy und tatsächlicher UGREEN-NAS-Deploymentpfad nicht getestet; Linux-Startskript und macOS-Start wurden geprüft.
- Echte Browseraktionen auf isoliertem Linux-Container: Einrichtung, passwortgeschützte Ordnerfreigabe, falsches und richtiges Passwort, mobile Ansichtsgröße 390 px, Einzel- und ZIP-Download, Statistik, Kurzlink-Erstellung und Inline-Bearbeitung. Die Downloadinhalte wurden überprüft. Dies ist keine vollständige visuelle, Tastatur- oder Barrierefreiheitsabnahme; spätere UI-Korrekturen sind darin nicht vollständig abgedeckt.
- Zwei unabhängige lesende Audits meldeten Risiken zu Stream-/Verzeichnisgrenzen, Rate-Limit-Isolation, Dateiänderungen, Analytics und Auswahlbearbeitung. Korrekturen und die oben genannten Regressionstests wurden danach ergänzt; der abschließende Audit fand keinen belegbaren Zugriffsschutz-Bypass, ersetzt aber kein umfassendes Security-Audit.
- NAS lesend erreicht: `DXP6800PRO`, `x86_64`. Keine Installation oder Änderungen auf dem NAS. Der NAS-SSH-Skill begrenzt diesen Zugriff auf lesende Aktionen.

### Noch offen für die vollständige Abnahme

1. Unabhängiges umfassendes Sicherheitsreview einschließlich Rest-Risiken beim Dateisystem, Rate-Limiting und Proxykonfiguration; zusätzliche ZIP-Fehler- und Langzeittests.
2. Vollständige UX-, visuelle und Barrierefreiheitsprüfung inklusive neuer Auswahlbearbeitung und aktueller deutscher Fehlermeldungen; gegebenenfalls weitere Anpassung an MediaLyze.
3. Praktischer Zoraxy- und UGREEN-NAS-Test mit ausdrücklich freigegebener isolierter Testumgebung sowie Windows-Startskript; keine Zielhardware- oder Zoraxy-Abnahme behaupten.
4. Release-Automation und Multi-Arch-Publishing in GitHub nach Veröffentlichung eines passenden Versionstags verifizieren; bis dahin keinen erfolgreichen Remote-Release behaupten.
5. Konkrete Leistungsziele für Dateigrößen/Parallelität festlegen und mit realistischen Daten auf der Zielhardware messen. Sehr große Verzeichnisse über 10.000 Einträge benötigen eine gesonderte Lösung.

### Einrichtung: 403-Fehler (2. November 2026)

- Im lokalen Entwicklungsmodus wurde ein Aufruf über `localhost` bei vorgegebenem Ursprung `127.0.0.1` abgewiesen. Entwicklungsstart erlaubt nun nur für ausdrücklich aktivierten, lokal gebundenen HTTP-Betrieb die Loopback-Namen auf demselben Port. Für öffentliche/Produktionskonfigurationen bleibt der konfigurierte Ursprung bindend.
- API und Oberfläche unterscheiden einen abgelehnten Ursprung von einem falschen Einrichtungsschlüssel. Bei lokalem Start ohne eigenes `SETUP_TOKEN` ändert sich der generierte Schlüssel bei jedem Neustart; maßgeblich ist der aktuelle Terminal-Start.
- Geprüft mit isolierter Datenbank und echtem Browser über `localhost`: falscher Schlüssel zeigt eine konkrete Meldung, richtiger Schlüssel erstellt das Konto. Die laufende Instanz und Daten des Nutzers wurden nicht verändert. Tests zu falschem Ursprung, falschem Port, deaktivierten Aliasen und öffentlichem Ursprung ergänzen die Prüfung.

### NAS-Start: SQLite-Datei nicht geöffnet (3. November 2026)

- Nutzer meldet beim NAS-Start `SQLITE_CANTOPEN`. Eine fehlende Schreib-/Traverseberechtigung für UID/GID 1000 auf dem nach `/data` gemounteten Host-Verzeichnis ist eine naheliegende Ursache; der tatsächliche Mount, Berechtigungen und andere mögliche Ursachen wurden noch nicht auf dem NAS geprüft. Eine Diagnoseanleitung steht in `docs/DEPLOYMENT.md`.
- Containerstart ergänzt: `PUID`/`PGID` (Standard 1000:1000) setzen Besitz des dedizierten `/data`-Ordners und der Standard-SQLite-Dateien, danach läuft die App ohne Root. Speicherquellen werden nicht verändert. Bei Rootless-Docker, NAS-ACLs oder anderen Dateisystemen kann `chown` fehlschlagen; individuelles `DB_PATH` und Docker-User-Overrides benötigen angepasste Rechte. Reale NAS-Prüfung und Veröffentlichung des neuen Images stehen aus.
- Isolierter Linux-Docker-Test mit zunächst root-eigenem Volume und vorhandener SQLite-Datei: Start mit UID 1234/GID 1235 erfolgreich, HTTP 200, Verzeichnis und Datenbank unter diesen IDs, Hauptprozess ebenfalls; ungültige PUID abgewiesen. Ein echter NAS-Bind-Mount und NAS-ACLs wurden dabei nicht geprüft.

### Abrufdetails (3. November 2026)

- Auf ausdrücklichen Nutzerwunsch speichern neue Ereignisse IP-Adresse, gekürzten User-Agent und gegebenenfalls ausschließlich den Ursprung des Referrers. Die Statistik zeigt die letzten 200 Ereignisse; bestehende Ereignisse haben keine rückwirkenden Details. SQLite-Migration 6 ergänzt die Felder; die vorhandene Aufbewahrungsfrist gilt auch für sie. IP-Adressen hängen von der korrekten Konfiguration vertrauenswürdiger Proxys ab. User-Agent und Referrer sind manipulierbar oder fehlen.
- Standort und präzise Geräte-/Browsererkennung sind nicht implementiert; eine grobe Erkennung aus dem User-Agent wird angezeigt; dafür wären zusätzliche Daten beziehungsweise Auswertung nötig. Datenschutzrechtliche Bewertung und gegebenenfalls Hinweise für Besucher stehen aus. Build und 23 automatisierte Tests wurden auf dem ARM64-Entwicklungs-Pi nach Installation von Node.js 24 erfolgreich ausgeführt; ein Docker-Daemonzugriff war dort nicht verfügbar.

### Entwicklungsstart auf dem Pi (3. November 2026)

- Node.js 24.22.2 benutzerspezifisch unter `~/.local/opt` installiert und über `~/.local/bin` verfügbar gemacht; `npm ci`, Build und 23 Tests erfolgreich. Der Entwicklungsserver startete lokal auf den Ports 5173 und 3000 und wurde nach dem Test beendet. Der Test für die Datenbankversion wurde auf Migration 6 aktualisiert.

### Lokaler Netzwerkzugriff (3. November 2026)

- Der Entwicklungsstart bindet Vite standardmäßig an alle IPv4-Schnittstellen; die API bleibt an Loopback gebunden. Beim Start werden Hostname, `.local`-Name und vorhandene IPv4-Adressen für Vite und die Origin-Prüfung freigegeben und ausgegeben. Änderungen an Netzwerkadressen erfordern einen Neustart. `FRONTEND_HOST=127.0.0.1` beschränkt Vite auf den Rechner. Produktions-Origin-Regeln bleiben unverändert.
- Build und 24 Tests bestanden. Isolierter Test auf alternativen Ports: Frontend über Hostheader `dev-pi.local` HTTP 200 und Einrichtung über denselben Origin HTTP 201; Namensauflösung von einem anderen Gerät und Firewall wurden nicht geprüft. Der bestehende Prozess auf Port 5173 wurde nicht verändert und muss für die Änderung neu gestartet werden. Entwicklungs-HTTP nur in vertrauenswürdigen Netzen einsetzen.

### Freigabenfilter (3. November 2026)

- Zusätzliche Überschrift „Alle Datenfreigaben“ entfernt; Statusfilter und Suche stehen bei ausreichender Breite nebeneinander und umbrechen bei Platzmangel. Visueller Browsertest steht aus.

### Kurznamen kopieren (3. November 2026)

- Kurznamen in Freigabe- und Kurzlinkübersicht als kompakte Schaltflächen gestaltet; ein Klick kopiert die vollständige konfigurierte Linkadresse und zeigt die vorhandene Rückmeldung. Die Öffnen- und Kopieren-Aktionen bleiben verfügbar. Visueller und interaktiver Browsertest steht aus.

### Lokale Testquelle (3. November 2026)

- Der lokale Entwicklungsstart erstellt bei fehlendem `SOURCES_JSON` das Git-ignorierte Verzeichnis `.local-test-files/` im Repository und bindet es als Quelle „Lokale Testdateien“ ein. Inhalte bleiben zwischen Starts erhalten und werden nicht automatisch gelöscht. Eine explizite `SOURCES_JSON`-Konfiguration ersetzt die Vorgabe; Produktiv- und Docker-Konfiguration bleiben unverändert.
- Geprüft: Build und Git-Ignore-Regel; isolierter Entwicklungsstart mit separater Datenbank lieferte die Testquelle über die authentifizierte Quellen-API. Ein explizites `SOURCES_JSON` wird laut Startlogik unverändert übernommen; ein separater Lauf dafür steht aus.

### Kurzlinkliste (3. November 2026)

- Spaltenüberschrift der Freigabeliste auf „Freigabe“ verkürzt. Kurzlinkliste zeigt Zieladresse vor Kurzname, hebt die gekürzte Zieladresse hervor und entfernt das Zeilensymbol; der Kurzname behält dieselbe Kopier-Schaltfläche wie bei Freigaben. Visueller Nachtest steht aus.

### Freigaben ohne Titel (3. November 2026)

- Freigaben verwenden den Kurznamen als sichtbaren Namen; optional bearbeitbare Beschreibungen werden mit Migration 7 gespeichert. Das bisherige Titelfeld bleibt intern für Kompatibilität bestehender Daten erhalten. Öffentliche Freigaben zeigen den Kurznamen. Bearbeitung erfolgt inline; Kopieren und Bearbeiten sind Icon-Schaltflächen, Aktivierung erfolgt über Schalter. Download- und Ablaufangaben nutzen Symbole.
- Build und 24 Tests erfolgreich; visuelle, interaktive und migrationsspezifische Prüfung steht aus.

### Benachrichtigungen (4. November 2026)

- Erfolgs- und Fehlermeldungen erscheinen unten rechts als nach Thema gruppierte Notification-Decks mit Soft Fill und der kontrastreichen MediaLyze-Farbpalette. Hover und Tastaturfokus fächern den Stapel auf und pausieren die Ablaufzeit; einzelne Meldungen lassen sich schließen. Reduzierte Bewegung und Dark Mode werden berücksichtigt. Alle Meldungen bleiben 2,5 Sekunden sichtbar; die Karten kürzen lange Texte optisch auf zwei Zeilen (vollständiger Text über Titel und Screenreader). Keine Einstellungen oder Verlauf implementiert.
- Gestaltung und Stapelverhalten angepasst aus MediaLyze, `frontend/src/components/NotificationHost.tsx` und `frontend/src/medialyze.css`, Stand `3c67044`; MediaLyze steht unter AGPL-3.0, ShareLyze unter AGPL-3.0-only. Die Übernahme ist im Quelltext gekennzeichnet. Build und 24 bestehende Tests erfolgreich; visueller und interaktiver Browsertest steht aus.

- Abgleich mit MediaLyze: Kontrastpalette (`contrast`), Soft Fill (`tint`), 2,5 Sekunden und Gruppierung nach Thema fest voreingestellt. Kopiervorgänge desselben Links und Änderungen der Linkadresse teilen jeweils ein Thema; Fehler ohne Thema bilden eigene Decks. Hover/Fokus und versteckte Browser-Tabs pausieren die Zeit. ShareLyze verwendet Schließen statt MediaLyzes Navigationspfeil und eigene Statussymbole; Auch offene modale Dialoge pausieren die Zeit; ein Benachrichtigungsverlauf ist nicht implementiert. Ein direkter visueller Vergleich steht aus.

### Benachrichtigungen und Statusspalte (4. November 2026)

- Notification-Host nutzt einen neutralen Container statt der global gestalteten Section und verschwindet leer vollständig. In beiden Listen steht der Aktivierungsschalter in einer schmaleren Statusspalte; abgelaufene Freigaben erhalten zusätzlich einen Hinweis. Visuelle und interaktive Prüfung steht aus.

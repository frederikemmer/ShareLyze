# ShareLyze – Projektziel und MVP-Plan

Stand: 2. November 2026. Dieses Dokument hält die bisher besprochenen Entscheidungen fest und ist ein Ausgangspunkt für nachfolgende Entwicklungsagents. Es beschreibt ein Zielbild, keine bereits vorhandene Implementierung.

## Produktziel

ShareLyze ist eine schlanke, vollständig selbst gehostete Open-Source-Anwendung für Dateifreigaben und Kurzlinks. Bestehende Dateien auf einem NAS sollen ohne Upload und ohne vollständige Kopie öffentlich freigegeben werden können. Empfänger erhalten eine übersichtliche Downloadseite, keinen allgemeinen Dateimanager. Administratoren verwalten Freigaben, Kurzlinks und grundlegende Statistiken in einer gemeinsamen Oberfläche.

> Share files directly from your storage. No duplicates. Just links.

Zielplattform ist unter anderem ein UGREEN NAS mit Docker Compose und Reverse Proxy, beispielsweise Zoraxy. Andere geeignete Reverse Proxys sollen ebenfalls unterstützt werden.

## Herkunft und Lizenz

- **Eigenständige Neuimplementierung**, kein Fork von SelfDrop und keine Übernahme von SelfDrop-Code, CSS, Assets oder anderen Projektbestandteilen. SelfDrop darf als Beispiel für Funktionen und technische Ansätze untersucht werden; daraus folgt keine Erlaubnis, Ausdrucksformen zu kopieren. Frühere Fork-Empfehlungen sind überholt.
- ShareLyze soll unter **AGPL-3.0** stehen. Bei Projektinitialisierung die genaue SPDX-Bezeichnung und Lizenzdatei entsprechend der gewählten AGPL-Variante festlegen; eine zusätzliche „or later“-Erlaubnis ist bislang nicht entschieden.
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
- Standardmäßig keine externen Tracker, Besucher-Tracking-Cookies oder IP-Adressen in Analytics. Aufbewahrung konfigurierbar und automatische Bereinigung. Protokolle von App und Reverse Proxy gesondert betrachten.
- Land, Referrer, Gerät und Browser nur als spätere optionale Erweiterung und nach gesonderter Datenschutzbewertung. Konkrete Standard-Aufbewahrungsdauer ist noch zu entscheiden.

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

- AGPL-3.0-only oder AGPL-3.0-or-later; genaue Hinweise bei MediaLyze-Übernahmen.
- Konkrete Testgrößen, Anzahl paralleler Downloads und akzeptabler Ressourcenverbrauch auf dem Ziel-NAS.
- Analytik-Aufbewahrungsdauer, Aggregation und Löschverhalten nach Entfernen einer Freigabe.
- Slug-Normalisierung, Wiedervergabe gelöschter Slugs und konkrete reservierte Routen.
- Handhabung von ZIP-Namenskollisionen, leeren Ordnern und sehr großen Dateilisten.
- Genaue Erstkonfiguration bei öffentlich erreichbarem Admin sowie Mechanismus für sichere Dateideskriptor-basierte Pfadauflösung auf Linux.
- Vorschauformate und weitere Storage-Backends nach dem MVP.

# ShareLyze – Projektziel und MVP-Plan

Einstellungen: Linkadresse, Standort/Netzanbieter, Aufbewahrung, Vorschau-Cache, Region/Zeitformat, Kurznamen und Speicherquellen sind wie Proxy und Upload-Filter einklappbar. Erläuterungen in Überschriften-Tooltips zusammengefasst; Aktionen und Entwürfe bleiben beim Einklappen erhalten. Build erfolgreich; Preview-Snapshot lief in einen Timeout, daher keine interaktive Browserprüfung.


Upload-Filter: Regelbereich einklappbar; Aktivierung und Zurücksetzen bleiben in der Kopfzeile erreichbar.


Upload-Filter: Schalter und Zurücksetzen in der Kopfzeile, Erklärungen als Tooltips, automatische Speicherung nach Eingabepause mit Benachrichtigung und Validierungsfehlern. Zurücksetzen betrifft die Regeln und erhält den Aktivierungszustand. Build und bestehende Upload-Einstellungstests erfolgreich (drei bestanden, ein plattformabhängig übersprungen); Browserzustand gesehen, interaktive Autosave-Prüfung offen.


Proxy-Einstellungen: Bereich einklappbar, Erklärungen an den jeweiligen Überschriften; Änderungen werden nach 1,2 Sekunden automatisch gespeichert und serverseitig unmittelbar angewendet. Ungültige Eingaben bleiben sichtbar mit Fehler; Umgebungsvariablen-Sperre bleibt bestehen. Build und bestehender Proxy-API-Test erfolgreich; eingeklappter Zustand im Browser gesehen, interaktive Autosave- und reale Reverse-Proxy-Prüfung stehen aus.


QR-Werkbank: Zusätzlichen Bearbeiten-Button im Kopf entfernt; Link und Kontext bleiben über die Schrittleiste erreichbar.


QR-Logo: Größe bei gewähltem Logo zwischen 8 und 18 % der Modulmatrix einstellbar (Standard 12 %), identisch für Vorschau und Export. Entfernen durch Wahl einer anderen Vorlage. Build und Decoderprüfung der Grenzwerte bei hoher Fehlerkorrektur bestanden; physische Scans und weitere Kombinationen bleiben offen.


QR-Fehlerkorrektur: Hilfe auf eine kompakte Tabelle der wiederherstellbaren Codewörter je Stufe reduziert.


QR-Logoauswahl: Gewähltes Standard- oder eigenes Logo ersetzt das Bildsymbol in der Auswahlschaltfläche; Entfernen liegt daneben.


QR-Logo-Hilfe: Technischen Hinweis zu SVG-Inhalten aus der Oberfläche entfernt; die Formatliste und Validierung bleiben bestehen.


QR-Code „Weich“: Module werden als gemeinsamer SVG-Pfad gezeichnet, um Rasterkanten zwischen benachbarten Flächen zu vermeiden; freiliegende Ecken haben größeren Radius, Funktionsmodule bleiben eckig. Build und QR-Decoderprüfungen erfolgreich; visuelle Browser- und physische Scanprüfung stehen aus.


QR-Werkbank: In der einspaltigen Ansicht Abstand und oberen Innenabstand vor der Vorschau von je 24 auf 12 px reduziert.


Freigabebearbeitung: Flexible Eingabefelder und Aktionsleiste wie bei Kurzlinks; Gültigkeit ersetzt den Aktiv-Schalter. Bereits deaktivierte Freigaben bleiben bis zu einer ausdrücklichen Änderung der Gültigkeit deaktiviert. „Inhalt ändern“ öffnet den bestehenden Auswahlbereich mit eigener Überschrift; die Auswahl ersetzt den Inhalt erst nach Bestätigung, Abbrechen stellt die vorherige Erstellungsauswahl wieder her. Build erfolgreich; Gesamttests: 66 bestanden, 6 übersprungen, ein unabhängiger QR-SVG-Test fehlgeschlagen (`xml:base`). Interaktive Prüfung des neuen Ablaufs steht aus.


Freigabeerstellung: Gültigkeit, Passwort, Erstellen und Abbrechen bilden eine gemeinsame, nicht umbrechende Aktionsgruppe; bei Platzmangel wechselt die Gruppe zusammen in die nächste Zeile.


Freigabenverwaltung: Ablauf und Passwortstatus wie bei Kurzlinks in der Zeile; Passwortkopie über authentifizierten, begrenzten Endpunkt und verschlüsselte Speicherung (Schema 16). Bestehende Passwörter müssen zum Kopieren neu gesetzt werden. Aktivierung und Löschen in der Bearbeitung. Build und lokale Suite geprüft (63 bestanden, 6 übersprungen); Browserprüfung blockiert, da die laufende API HTTP 500 lieferte. Passwortablauf und Migration benötigen zusätzliche gezielte Integrationsprüfung.


Lokale Entwicklung: Die plattformspezifischen Starter starten Frontend und Backend nativ ohne Docker; Vite aktualisiert das Frontend und Node startet das Backend bei Änderungen neu. Sichere Quellen- und Uploadfunktionen setzen weiterhin Linux voraus; macOS und Windows sind hierfür eingeschränkt. Plattformübergreifende Funktionsprüfung steht aus.


Entwicklungsserver: Kurzlinks mit Großbuchstaben und Query-Parametern werden nun wie andere Kurzlinks an das Backend weitergeleitet, statt durch den SPA-Fallback auf der Admin-Oberfläche zu landen. Build und lokale Tests erfolgreich (38 bestanden, fünf übersprungen); Browserprüfung und Prüfung einer konkreten NAS-/Reverse-Proxy-Konfiguration stehen aus. Der Entwicklungsserver muss für die geänderte Vite-Konfiguration neu gestartet werden.

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

- Mehrere bestehende NAS-Verzeichnisse als getrennte Quellen einbinden. Docker-Bind-Mounts bleiben schreibgeschützt; Uploads werden separat im beschreibbaren ShareLyze-Speicher abgelegt. Keine Schreiboperationen auf den bestehenden Quelldateien.
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
- Eindeutigkeit und reservierte Systemrouten zentral durchsetzen. Externe Ziele für das MVP auf gültige HTTP- und HTTPS-URLs beschränken. Linkerstellung, Anzeige, Bearbeitung, Ablauf und Löschen vorsehen; separate Deaktivierung entfällt für Kurzlinks.
- Öffentliche Basis-URL explizit konfigurieren; Betrieb mit eigener Domain oder Subdomain hinter verschiedenen Reverse Proxys ermöglichen.

### Analytics und Datenschutz

- Aufrufe pro Freigabe und Kurzlink sowie Downloads je Freigabe und Datei erfassen; zeitliche Auswertung ermöglichen. Für allgemeine Kurzlinks Weiterleitungen gesondert zählen.
- Ereignisse eindeutig definieren: Seitenaufruf, Weiterleitung, Downloadstart und soweit beobachtbar serverseitig abgeschlossene Übertragung. Letzteres beweist nicht, dass der Empfänger eine Datei gespeichert oder geöffnet hat. Range-Requests, Wiederaufnahmen, Bots und wiederholte Anfragen nicht als eindeutige Personen ausgeben.
- Ein ZIP-Abschluss ist zunächst ein Ereignis für das Archiv; daraus nicht automatisch abgeschlossene Einzeldownloads jeder enthaltenen Datei ableiten.
- Keine externen Tracker oder Besucher-Tracking-Cookies. Auf Nutzerwunsch werden IP-Adresse, User-Agent und die Herkunfts-Domain pro Ereignis gespeichert; Aufbewahrung konfigurierbar und automatische Bereinigung. Protokolle von App und Reverse Proxy gesondert betrachten.
- Standort-/ASN-Ermittlung ist inzwischen über lokale, einmalig installierbare DB-IP-Lite-Datenbanken umgesetzt (siehe erweiterten Statistikstand unten). Geräte- und Browserinformationen werden aus ungeprüftem User-Agent und verfügbaren Client Hints abgeleitet. Standard-Aufbewahrung: dauerhaft; zeitliche Begrenzung in Einstellungen oder per expliziter Deploymentvariable.

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

- Öffentliche Freigabe: Außenabstände seitlich und Abstand unter dem Header auf 10 px zuzüglich seitlicher Safe Areas gesetzt; Build erfolgreich und Desktopposition im Browser-Snapshot geprüft. Die maximale Shellbreite bleibt bestehen.

- Grüne Fokusumrandungen durch neutrale, hell-/dunkelmodusabhängige Tastatur-Fokusmarkierungen ersetzt; die grüne Umrandung offener Optionen entfernt. Hoverflächen bleiben erhalten. Build erfolgreich; vollständige visuelle und Tastaturprüfung in allen Ansichten steht aus.

- Öffentliche Freigabe: Abstand oberhalb des Ordnerpfads um 4 px verringert. Build erfolgreich; Position im Desktop-Browser-Snapshot geprüft.

- Öffentliche Medienvorschau: Bilder und Videos im aktuellen Ordner öffnen einen modalen Dialog; Dateiname, Dateigröße und kompakte Downloadpille stehen unter dem Medium. Pfeiltasten und Schaltflächen wechseln zwischen Medien; bei fokussierter Videosteuerung bleiben deren Pfeiltasten erhalten. Videos werden ohne Transcoding mit Browsersteuerung abgespielt, bei nicht unterstützten Formaten/Codecs oder Ladefehlern erscheint ein Hinweis. Der geschützte Originalendpunkt prüft Freigabe, Passwort, Pfad und Container-/Bildsignatur und unterstützt Range; er zählt nicht als Downloadstart. Vorausgewählte Videoerweiterungen: MP4, M4V, MOV, WebM, MKV, OGV und AVI, soweit die Signatur erkannt wird; Browser und Codec bestimmen die tatsächliche Wiedergabe. Build erfolgreich; lokale HTTP-Tests (38 bestanden, fünf übersprungen) prüfen unter anderem Zugriffsschutz und Video-Range mit gemocktem Storage und synthetischen Daten. Die frühere Bildvorschau wurde im Browser geöffnet und per X/Escape geschlossen; die neue Mediennavigation, Darstellung und tatsächliche Videowiedergabe sind noch nicht im Browser, auf Mobilgeräten oder NAS geprüft.

- Öffentliche Downloadpillen: Breite des Downloadbuttons auch in der Kompaktansicht an die übrigen Ansichten angeglichen; Höhe bleibt 28 px. Build erfolgreich; Kachelansicht im Browser geprüft, Kompaktansicht nach Änderung nicht erneut visuell geprüft.

- Öffentliche Ordnerzeilen: Trennlinie entfernt und Hover-/Fokushintergrund auf die gesamte Zeile einschließlich Downloadbereich ausgeweitet. Build erfolgreich; Browser-Snapshot aufgenommen, Hoverzustand darin nicht eindeutig sichtbar.

- Öffentliche Downloadpille auf 28 px Höhe reduziert und Federanimation des Pfeils beschleunigt. Build erfolgreich; Desktop-Browser-Snapshot bestätigt die Höhe, die Animation wurde nicht zeitlich vermessen.

- Öffentliche Downloadaktionen: Dateigröße und Downloadbutton als gemeinsame segmentierte Pille. Der Pfeil folgt dem vorgegebenen Motion-Federverlauf bei Hover und Tastaturfokus; reduzierte Bewegung wird berücksichtigt. `motion` (MIT) als Laufzeitabhängigkeit ergänzt. Build erfolgreich, 38 Tests bestanden und fünf übersprungen; Pille in Desktop-Browseransicht gesehen, Animation und reduzierte Bewegung nicht visuell abgenommen.

- Öffentliche Freigabe: Ordner erscheinen auch in der Kachelansicht als breite Zeilen wie in der Listenansicht; Build erfolgreich und Breite in der Browseransicht geprüft.

- Öffentliche Freigabe: zusätzliche Kompaktansicht mit gemeinsamer dichter Liste und Ordnern zuerst; Listenansicht zeigt Ordner über die volle Breite. Dateien und Ordner besitzen separate Downloadaktionen und nachgeladene Größen. Ordnerdownloads erstellen ein gestreamtes ZIP nur für den gewählten Ordner mit der bestehenden festen Dateiliste. Die angezeigte Ordnergröße ist die zum Abruf gemessene Summe der Quelldateien, nicht die ZIP-Größe; fehlgeschlagene oder begrenzte Messungen erscheinen als Strich. Die Messung nutzt denselben sicheren Quellzugriff und höchstens 100.000 Einträge; gleichzeitige Messungen sind begrenzt. Build erfolgreich und lokale Tests (38 bestanden, fünf übersprungen) prüfen unter anderem Passwortschutz, Traversal und ZIP-Inhalt eines Unterordners mit gemocktem Storage. Browserprüfung zeigte Umschaltung zur Kompaktansicht und Größen im bestehenden Datensatz; tatsächlicher Browser-Download, Mobil-, Last- und NAS-Prüfung stehen aus.

- Öffentliche Freigabe: Innenabstand oben und seitlich verkleinert; Build erfolgreich und Desktopdarstellung im Browser angesehen. Mobile Darstellung nicht geprüft.

- Öffentliche Freigabe: Inhaltsbereich auf Headerbreite, ZIP-Download neben der Überschrift und Breadcrumb-Navigation. Ein einzelner freigegebener Ordner öffnet direkt; Unterordner stehen getrennt über den Dateien. Kachel- und Listenansicht sind über ein Menü umschaltbar; beide zeigen Bildminiaturen, andere Dateien ein Symbol. Der eigene Vorschauendpunkt prüft Freigabe, Passwort und Pfad, erzeugt begrenzte JPEG-Miniaturen ohne Downloadereignis und unterstützt JPEG, PNG, GIF, WebP und AVIF; nicht darstellbare oder über 50 MiB beziehungsweise 40 Megapixel große Bilder erhalten ein Ersatzsymbol. Bilder werden dynamisch gelesen; persistenter Vorschau-Cache inzwischen umgesetzt (siehe Stand 6. November unten). Build und lokale Tests erfolgreich; Browserprüfung mit bestehender Freigabe zeigte Bildkacheln und Umschalten zur Liste. Unterordner, Downloads, Mobilansicht, NAS und Lastverhalten sind noch nicht interaktiv geprüft.

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
- Öffentliche und Admin-Oberfläche verwenden 10 px Abstand oben und seitlich zuzüglich seitlicher Safe Areas, maximal 1500 px Gesamtbreite; zwischen Admin-Header und Hauptbereich liegen ebenfalls 10 px. Build erfolgreich, visuelle und mobile Prüfung der Admin-Abstände steht aus.
- Admin-Oberfläche mit eigenständigen Bereichen für Freigaben, Kurzlinks, Statistiken und Einstellungen, kompakteren Listen und innenliegenden Feldbeschriftungen. Die Dateiauswahl bietet Pfadnavigation und Mehrfachauswahl sichtbarer Einträge; pro Freigabe sind höchstens 500 direkt ausgewählte Elemente möglich. Ordner bleiben dynamisch.
- Die öffentliche Linkadresse lässt sich persistent in den Einstellungen ändern und wird für kopierte Links verwendet. Sie konfiguriert weder DNS noch Reverse Proxy oder den als Sicherheitsgrenze verwendeten Admin-Ursprung `PUBLIC_ORIGIN`; letzterer muss weiterhin separat zum tatsächlichen Admin-Aufruf passen. HTTPS ist erforderlich, HTTP nur für Loopback. SQLite-Migration 5 speichert diese Einstellung.
- Statistikseite mit Link- und Ereignisfilter, Tagesverlauf und Dateiübersicht. Die Dateiübersicht ist auf die 100 häufigsten Einträge über alle Links begrenzt; Filter zeigen nur Einträge innerhalb dieser Auswahl. Downloadstarts zählen auch Range-Anfragen und abgeschlossene Serverübertragungen belegen keine Speicherung beim Empfänger.
- Eigenständige TypeScript-Anwendung, SQLite-Migrationen, Admin-Ersteinrichtung mit Setup-Token, scrypt-Passwortprüfung, widerrufbare Sessions, Origin-Schutz und getrennte Rate-Limits für Setup, Login, Freigabe-Passwort und öffentliche Ordneransicht. Vertrauenswürdige Proxy-Adressen sind ausdrücklich zu konfigurieren; ohne sie teilen sich Clients hinter einem Proxy ein Limit.
- Mehrere Quellen über automatische Mount-Erkennung unter `/sources`, dynamische Ordner- und Dateifreigaben, Ablauf, Passwort, Bearbeiten/Deaktivieren sowie Freigabe- und externe Kurzlinks. Entfernte Quellen werden deaktiviert; ein von bestehenden Freigaben genutzter Quellenpfad darf nicht stillschweigend ersetzt werden.
- Linux-Dateizugriff über gehaltene Verzeichnis-Deskriptoren mit Symlink- und Sonderdatei-Abweisung. Ordneransichten begrenzen die eingelesenen Einträge auf 10.000 und öffentliche Ansichten sind gedrosselt. Größere Ordner benötigen später Pagination; sie werden derzeit abgelehnt.
- Datei-Streaming mit Range/If-Range, maximal 32 parallele Dateitransfers und drei ZIP-Streams. ZIPs nutzen eine feste Liste, keine vollständige Kopie und höchstens 10.000 Einträge/50 Ebenen. Metadaten werden vor und nach dem Lesen verglichen. Das ist keine atomare Momentaufnahme: Änderungen gleicher Metadaten oder bereits übermittelte Bytes können nicht garantiert erkannt oder zurückgenommen werden; für ZIPs ist Fortsetzen nicht vorgesehen.
- Ereignisse und Tageswerte je Link, Dateien und Freigaben mit konfigurierbarer Löschung, standardmäßig dauerhafter Aufbewahrung. Ereignisse sind keine eindeutigen Personen oder sichere Bestätigung, dass eine Datei beim Empfänger gespeichert wurde.
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
- Historischer Stand vor dem erweiterten Statistikumbau: nur grobe Geräte-/Browsererkennung ohne Standort. Inzwischen durch lokale GeoIP-/ASN-Ermittlung und UAParser/Client-Hints ergänzt (siehe unten); die Angaben bleiben Näherungen/Clientangaben. Datenschutzrechtliche Bewertung und gegebenenfalls Hinweise für Besucher stehen aus. Build und 23 automatisierte Tests wurden auf dem ARM64-Entwicklungs-Pi nach Installation von Node.js 24 erfolgreich ausgeführt; ein Docker-Daemonzugriff war dort nicht verfügbar.

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

- Der lokale Entwicklungsstart erstellt `.local-sources/Testdateien` als Git-ignorierte Testquelle. `SOURCES_ROOT` wählt alternativ ein Elternverzeichnis; unter macOS wird dieses als `/sources` an das Linux-Backend gemountet. Die frühere `SOURCES_JSON`-/`.local-test-files`-Vorgabe ist abgelöst. Bestehende Dateien dort bleiben unverändert; bei Umstieg auf neue Containerpfade bestehende Freigaben verifizieren/neu anlegen.
- Der aktuelle isolierte Container-/Quellen-Nachweis ist unter dem Stand 6. November protokolliert; frühere Prüfungen mit SOURCES_JSON sind historische Nachweise für die abgelöste Konfiguration.

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

### Suche und Filter (4. November 2026)

- In Freigabe- und Kurzlinkansicht steht die kompaktere Suche links und das Statusfilter rechts in einer gemeinsamen, bei Platzmangel umbrechenden Zeile. Die Überschrift „Alle Kurzlinks“ ist entfernt. Visueller Nachtest steht aus.

### Kurzlinkaktionen (4. November 2026)

- Spaltenüberschrift der Kurzlinkliste entfernt. Öffnen, Kopieren und Bearbeiten in beiden Verwaltungslisten einheitlich gestaltet und mit den gewünschten Symbolformen und CSS-Bewegungen versehen; reduzierte Bewegung wird beachtet. Umsetzung ohne zusätzliche Motion-Abhängigkeit. Produktionsbuild erfolgreich; visueller und interaktiver Browsertest steht aus.

- Kurzlinkliste: Kurzname steht links, die kleinere graue Zieladresse direkt daneben und wird bei Platzmangel mit Auslassung gekürzt. Build erfolgreich; visueller Nachtest steht aus.

- Kurzlinkliste: Statusschalter direkt vor die Aktionssymbole verschoben. Build erfolgreich; visueller Nachtest steht aus.

- Kurzlinkzeilen: Weiterleitungszahl und Aktionen belegen nur ihre benötigte Breite; die Zieladresse schrumpft bei schmaler Ansicht. Build erfolgreich; responsive Sichtprüfung steht aus.

- Kurzlinkfilter zeigt zunächst die aktuelle Auswahl; Hover oder Fokus blendet die übrigen Optionen animiert ein, reduzierte Bewegung deaktiviert den Übergang. Build erfolgreich; Prüfung mit Maus, Tastatur und Touch steht aus.

- Schmale Ansicht: Kopfzeile hält Logo und Navigation zusammen, solange Platz vorhanden ist. Suchfelder können schrumpfen; ihre Inline-Beschriftung bleibt sichtbar. Build erfolgreich; responsive Sichtprüfung steht aus.

- Kurzlinksuche und Filter bleiben nebeneinander; das Suchfeld schrumpft flexibel. Build erfolgreich; Sichtprüfung schmaler Ansichten steht aus.

- Kurzlinkfilter und ausklappbare Suche stehen in der Überschriftenzeile. Beim Schließen wird die Suche zurückgesetzt und der Fokus zum Suchsymbol zurückgeführt. Build erfolgreich; interaktive und responsive Prüfung steht aus.

- Schließen-Symbol der Kurzlinksuche rechts neben das Suchfeld verschoben; Build erfolgreich.

### ShareLyze-Icon (4. November 2026)

- Ausgewähltes eigenständiges Markenzeichen integriert: dunkles S mit hellgrauen, unterbrochenen Kettengliedern auf warmer heller Kachel. Eine SVG-Maske hält die grauen Bögen mit gleichmäßigem Abstand vom S getrennt. MediaLyze diente als Farbreferenz; keine Logo-Geometrie übernommen.
- `frontend/public/logo.svg` ist die Vorlage mit konturfolgenden Aussparungen an den grauen Enden. Die Kopfzeile zeigt die hintergrundlose Variante neben dem Schriftzug, auf schmalen Ansichten allein; `prefers-color-scheme` wählt die passende helle/dunkle Version. SVG-/ICO-Favicon, PNGs (16/32/180/192/512 px), Apple-Touch-Icon und Webmanifest eingebunden. Keine vollständige Offline-/PWA-Funktion zugesichert.
- `npm run generate:icons` erzeugt die abgeleiteten Dateien reproduzierbar mit der Entwicklungsabhängigkeit Sharp. Produktionsbuild einschließlich TypeScript-Prüfung erfolgreich; PNG-/ICO-Formate und Größen geprüft und das gerasterte 512-px-Icon visuell kontrolliert. Live-Browserprüfung der Kopfzeile, Browser-Favicon-Caches und installierter Homescreen-Icons steht aus.

- Logo-Varianten: `logo-light.svg` / `logo-dark.svg` mit Kachel sowie `logo-light-transparent.svg` / `logo-dark-transparent.svg` ohne Hintergrund (Namen bezeichnen das umgebende Theme). In den transparenten Varianten haben die ergänzenden Glieder dieselbe Farbe wie das S mit 32 % Deckkraft; die Zwischenräume bleiben transparent. Alle Varianten und Favicons werden aus der Vorlage mit `npm run generate:icons` erzeugt. Vier SVGs gerastert und auf weißem/schwarzem Hintergrund visuell geprüft; Produktionsbuild inklusive TypeScript erfolgreich. Live-Prüfung des Headers und Theme-Wechsels steht aus.

- Kopfzeilenlogo von 42 auf 48 px vergrößert. Produktionsbuild erfolgreich; Sichtprüfung im Browser steht aus.

- Versionsangabe an der Unterkante des Schriftzugs ausgerichtet; Build erfolgreich, Sichtprüfung steht aus.

- Smartphone-Ansicht bis 600 px: Admin-Kopfzeile durch festen ShareLyze-Menübutton am rechten unteren Rand ersetzt. Menü enthält Navigation und Abmelden, Escape schließt es; öffentliche und nicht angemeldete Ansichten behalten die Kopfzeile. Build erfolgreich; Touch-, Tastatur- und Sichtprüfung stehen aus.

- Kurzlink-Erstellung entfaltet sich anstelle des Buttons: Zieladresse und optionaler Kurzname stehen neben „Erstellen“ und dem Abbrechen-Symbol in einer Zeile. Reduzierte Bewegung wird beachtet. Build erfolgreich; visuelle und interaktive Prüfung steht aus.

- Eingabefelder und Auswahlfelder verwenden die kompaktere Mindesthöhe von 34 px; die frühere 42-px-Regel wurde entfernt. Kurzlinkformular blendet nur noch ein, ohne Skalierung; reduzierte Bewegung bleibt berücksichtigt. Build erfolgreich; formularübergreifende visuelle Prüfung steht aus.

- Datenfreigaben an Kurzlinks angeglichen: Suche in der Überschriftenzeile aufklappbar, Statusfilter auffächerbar, Spaltenüberschriften entfernt und Statusschalter vor Aktionen. Download- und Ablaufangaben bleiben erhalten; bei sehr schmalen Ansichten darf der Ablauf umbrechen. Beide Listen behalten ihre bisherige Reihenfolge; eine Sortierfunktion besteht derzeit nicht. Build und Tests erfolgreich (21 bestanden, 3 übersprungen); visuelle und interaktive Prüfung steht aus.

- Freigabeauswahl zeigt verfügbare Speicherquellen direkt als öffnbare Ordner; Rückkehr zur Quellenübersicht über Pfadnavigation oder Zurück. Überschrift und Hinweistext entfernt. Build erfolgreich, Tests: 21 bestanden, 3 übersprungen; Browserprüfung ausstehend. Datei-/Ordner-Upload verwendet den separaten ShareLyze-Speicher; bestehende Quellen bleiben lesend eingebunden.

### Separater Upload-Speicher (5. November 2026)

- Dateien und Ordner können bei der Freigabeauswahl hochgeladen werden. Uploads werden unter `uploads` neben der Datenbank gespeichert (Docker: `/data/uploads`) und als eigene Quelle ausgewählt; `UPLOAD_ROOT` kann ein separates persistentes Verzeichnis festlegen. Bestehende Quellen bleiben unverändert. Der Inhalt des Upload-Speichers muss zusammen mit der Datenbank gesichert werden.
- Uploads streamen einzeln, mit maximal 10 GiB je Datei und maximal 500 Dateien je Auswahl; Pfade werden geprüft, vorhandene Dateien nicht überschrieben und Symlinks bei der Erstellung abgewiesen. Ein abgebrochener Upload wird nach Möglichkeit entfernt; bereits vollständige Dateien bleiben erhalten und werden bei teilweisem Fehler ausgewählt. Leere Ordner und Fortsetzung sind noch nicht implementiert; verzögerte Löschung und automatische Bereinigung sind inzwischen umgesetzt (siehe Stand 6. November); Speicherplatz und Berechtigungen müssen überwacht werden. Ein Ordnerupload hängt von Browserunterstützung für `webkitdirectory` ab.
- Produktionsbuild und lokale Tests erfolgreich (22 bestanden, 3 Linux-Tests übersprungen). Docker-Image gebaut und isolierter Linux-API-Test erfolgreich: Authentifizierung, Origin, Traversal, Symlink, Überschreiben, Stream und Freigabe einer hochgeladenen Datei. Eine Browser-, NAS-, Last- und umfassende Sicherheitsprüfung steht aus.

### Ablauf und Statistik (6. November 2026)

- Downloadstarts, Weiterleitungen und Ablauf in dezenten grauen Pillen. Unbegrenzte Freigaben zeigen keine Ablaufpille; begrenzte zeigen aktualisierte Restzeit (Minuten ganzzahlig, Stunden und Tage auf eine Dezimalstelle gerundet), abgelaufene einen Hinweis. Der genaue Ablauf ist als Tooltip verfügbar. Build und Tests erfolgreich (23 bestanden, 3 übersprungen); Sichtprüfung steht aus.

### UI-Konzept nach Icon-Referenz (6. November 2026)

- Nutzer stellt klar: Gewünscht ist ein Konzept für das App-UI, kein neues Logo. Die irrtümlich erstellten Logoentwürfe unter `docs/design/sharelyze-icon-concept/` und ihr Planeintrag wurden entfernt; das bestehende Produktlogo bleibt erhalten.
- **Entwürfe, nicht implementiert:** Drei mit ImageGen erzeugte visuelle Richtungen liegen unter `docs/design/sharelyze-ui-concept/`; `CONCEPT.md` beschreibt die Übertragung auf die App. Die bereitgestellten MediaLyze-SVGs wurden als gerasterte Bildreferenzen mitgegeben. Gemeinsame Grundlage: warme neutrale Farben, Graphit, abgerundete Konturen, zurückgesetzte Metadaten, flache kompakte Listen und bestehende Kopfnavigation.
- Die frühere Bevorzugung des ersten kompakten hellen Entwurfs ist aufgehoben: Nutzer hat inzwischen alle bisherigen Varianten verworfen; die Auswahl ist wieder offen. Die Bilder enthalten illustrative Beispieldaten und sind keine Browsernachweise. Einzelne generierte Details (z. B. interne Pfade, Bezeichnung „Downloads“, dekorative Datumsangabe, doppelte Statusanzeige) sind nicht als Produktentscheidung übernommen. Keine Änderung am produktiven Frontend und keine neue Funktionszusage.
- **UI-Konzept verdichtet:** Auf Nutzerwunsch drei überarbeitete `*-compact.png`-Entwürfe erstellt: ikonische Kopfnavigation/Aktionen, Suche bei Bedarf, kompakte gemeinsame Überschriften-/Filterzeile, kürzere Listenzeilen und Beschreibungen inline. Doppelte Statusplaketten und ausformulierte Metadaten entfallen. Vorgeschlagene Maße, Tooltips/zugängliche Namen und Touch-Ausnahmen stehen in `CONCEPT.md`. Die Bilder sind weiterhin rein visuelle Entwürfe mit illustrativen Daten (darunter ein unzutreffender generierter Filterzähler im dunklen Bild); keine Implementierung, Interaktions- oder Responsive-Abnahme.
- **Bevorzugte Richtung verfeinert:** Nutzer bevorzugt die erste kompakte helle Variante und wünscht sie „technokratischer“. Neuer Entwurf `01-warm-paper-technical.png`: strengeres Raster, kleinere Radien, präzisere Trenner und Monospace für Kurznamen/Zahlen; warme neutrale Palette, kompakte Icon-Bedienung und bestehender Funktionsumfang bleiben Grundlage. Interpretation und vorgeschlagene Maße stehen in `CONCEPT.md`. Verfeinerung inzwischen ebenfalls verworfen; weiterhin keine produktive UI-Änderung oder Browserprüfung.
- **Neue Designauswahl nach Ablehnung:** Drei bewusst andere Entwürfe erstellt und unter `docs/design/sharelyze-ui-concept/` gesichert: `04-rail-studio.png` (helle Liste mit Icon-Leiste links), `05-night-browser.png` (dunkle Freigaben-/Dateiansicht in zwei Bereichen), `06-object-shelf.png` (kompakte Freigabekacheln). Kompakte Icon-Bedienung bleibt gesetzt; Farben und Inhaltsmodell sind Teil der offenen Auswahl. Die hier zunächst erkundete Navigationslage wurde durch die folgende Nutzerkorrektur festgelegt. `CONCEPT.md` kennzeichnet die früheren Entwürfe als verworfen. Keine neue Funktion implementiert und keine Browser-/Responsive-Prüfung behauptet.
- **Top-Menü verbindlich beibehalten:** Nutzer betont, dass die bisherige obere Navigation wichtig ist. Alle drei neuen Richtungen darauf angepasst und als `04-light-list-top-menu.png`, `05-night-browser-top-menu.png`, `06-object-shelf-top-menu.png` gespeichert: Wortmarke links, zentrale kompakte Icon-Navigation, Konto rechts. Linke App-Leiste entfällt; die linke Freigabenauswahl der dunklen Variante ist nur Inhalt. `CONCEPT.md` korrigiert die bisher offene Navigationslage. Auswahl des übrigen Designs weiterhin offen; keine produktive Änderung oder Browserprüfung.

### Kurzlink-Optionen: drei Konzepte (6. November 2026)

- Nutzer wünscht optionale Gültigkeit und Passwort auch für externe Kurzlinks, zunächst verborgen und bei Bedarf ausklappbar. Drei visuelle Konzepte unter `docs/design/short-link-options/` samt `CONCEPT.md`: Zusatzzeile im Formular, verankertes Popover und seitliches Panel/Smartphone-Sheet. Bestehende kompakte Zeile und reines Einblenden bleiben Grundlage; Variante 2 wurde inzwischen als zwei getrennte Icon-Popovers ausgewählt.
- Die Bildentwürfe dokumentieren die Auswahlphase; die folgende Umsetzung konkretisiert die ausgewählte Variante. Die Entwürfe sind keine Browsernachweise. Vorhandene Nutzeränderungen wurden beibehalten.

### Getrennte Kurzlink-Popovers (6. November 2026)

- Gültigkeit und Passwortschutz haben eigene Icon-Auslöser beim Erstellen und Bearbeiten. Kalender mit Zahnrad ohne Einstellung, Kalender mit Restzeit nach Auswahl; offenes/geschlossenes Schloss ohne sichtbaren Passwortwert. Symbolgeometrien nach den vom Nutzer gelieferten Lucide-Vorlagen, Animationen in CSS angepasst und bei reduzierter Bewegung deaktiviert. Passwortschutz folgt dem Feldinhalt, ohne Schalter. Vorhandene Passwörter werden beim Bearbeiten nicht zurückgegeben; unveränderte Eingaben behalten sie bei, das Entfernen-X oder das Leeren eines geänderten Passwortfelds löscht den Schutz.
- Popovers erscheinen unter dem jeweiligen Auslöser durch Einblenden, schließen nach einer Zeitvorgabe, per Escape oder Außenklick. Vorgaben für 1h/1d/7d/30d und eigener Zeitpunkt; eingestellte Restzeit bleibt am Kalender sichtbar. Position wird auf die Viewportbreite begrenzt.
- Migration 8 ergänzt Passwort-Hash und Ablauf für externe Kurzlinks. Anlegen und Bearbeiten validieren beides; beide öffentlichen Wege (`/:slug`, `/r/:slug`) beachten Ablauf und Passwort; die separate Kurzlink-Deaktivierung ist inzwischen entfallen. Passwortprüfung hat ein Rate-Limit und Origin-Prüfung; vor erfolgreicher Prüfung wird kein Weiterleitungsziel ausgegeben. Geschützte Kurzlinks zeigen eine Passwortseite und leiten nach erfolgreicher Eingabe weiter. Schutz betrifft den Kurzlink, nicht die externe Zielseite selbst.
- Build und Tests erfolgreich (24 bestanden, 3 übersprungen). Neuer API-Test prüft beide öffentlichen Wege, fehlgeschlagenes/erfolgreiches Passwort, Origin, Ablauf, Deaktivierung, Entfernen des Schutzes und Geheimhaltung des Hashes/Ziels. Interaktive Browser-, Responsive- und umfassende Sicherheitsprüfung noch offen. Nicht veröffentlicht.

- Korrektur der Kurzlink-Popovers: keine Mindestlänge für Kurzlink-Passwörter in Oberfläche oder API; auch ein Zeichen kann gesetzt und geprüft werden. Ein leeres Feld entfernt den Schutz. Die bestehende maximale Eingabegröße bleibt erhalten. Die Mindestlänge für das Administratorkonto bleibt separat bestehen. API-Test deckt Anlegen, Prüfen und Ändern eines Ein-Zeichen-Passworts ab.
- Optionen ohne Wert verwenden flache Icon-Buttons im Stil der Listenaktionen. Erst konfigurierte Optionen werden als dezente Pillen dargestellt. Build und Tests erfolgreich (24 bestanden, 3 übersprungen); Browser-Sichtprüfung weiterhin offen.

### Vorschläge und Vorgaben für Kurznamen (6. November 2026)

- Erstellformulare für Kurzlinks und Datenfreigaben enthalten direkt einen serverseitig erzeugten, frei bearbeitbaren Kurznamen. Feldbeschriftung „Kurzname“ ohne „optional“; nach erfolgreichem Anlegen folgt ein neuer Vorschlag. Vorschläge sind noch keine Reservierung, die eindeutige Vergabe erfolgt beim Speichern. Selbst geänderte Entwürfe werden bei einer Änderung der Vorgaben nicht überschrieben.
- Eigener Einstellungsbereich: Länge 4–64 Zeichen, Buchstaben oder alphanumerisch, Klein-/Großbuchstaben oder gemischt, verwechselbare Zeichen vermeiden und Groß-/Kleinschreibung beim Aufruf beachten. Standard: 6 Zeichen, alphanumerisch, groß, verwechselbare Zeichen vermeiden, Aufruf ohne Unterscheidung. Einstellungen persistent in SQLite; kryptografisch zufällige, gleichverteilte Auswahl und Prüfung auf belegte/reservierte Namen. Die Zeichensatz-/Längenvorgaben betreffen Vorschläge; eigene gültige Kurznamen bleiben möglich und ihre Schreibweise sichtbar erhalten.
- Migration 9 speichert die Aufrufregel je Link. Bestehende Links werden ohne Groß-/Kleinschreibungsunterscheidung aufgelöst; neue übernehmen die aktuelle Einstellung. Alle öffentlichen Kurzlink- und Freigabewege beachten dieselbe Regel. Ein eindeutiger Index auf die kleingeschriebene Form verhindert mehrdeutige Namen, auch wenn die Aufrufregel Groß-/Kleinschreibung unterscheidet. Bestehende Links ändern sich nicht durch spätere Vorgaben.
- Build erfolgreich. Lokal 27 Tests bestanden, vier Linux-Prüfungen übersprungen. Isoliert unter Linux/Docker alle 30 Backend-Tests bestanden, einschließlich echter Dateifreigaben mit generierten Großbuchstaben, Einstellungen, Kollisionen, Aufrufregeln und unverändert erreichbaren Altlinks. Erster Docker-Testlauf benötigte zusätzlich den lesenden Mount der Release-Testdateien aus `.github`; nach Ergänzung vollständig erfolgreich. Browser-/Responsive-Prüfung steht aus. Änderungen lokal, nicht veröffentlicht.

- Kurznamen-Vorgaben anhand der Nutzerreferenz angepasst: 6 Stellen, Buchstaben und Zahlen, Großbuchstaben, Aufruf ohne Groß-/Kleinschreibungsunterscheidung, verwechselbare Zeichen vermeiden. Gespeicherte individuelle Vorgaben bleiben erhalten. Hinweistext zum Aufrufverhalten als Info-Tooltip hinter der Überschrift (Maus, Tastaturfokus und Touch); Einleitungsabsatz entfernt. Die alten prozentualen rechten Innenabstände aller Inline-Eingabe-/Auswahlfelder entfernt; Inhalte nutzen die verfügbare Feldbreite auch hinter dem Inline-Label, Dropdowns reservieren nur Platz für den Pfeil.
- Prüfung dieser Anpassung: Produktionsbuild erfolgreich, lokal 27 Tests bestanden und vier Linux-Prüfungen übersprungen. API-Test bestätigt die neuen Standardwerte und erzeugte sechsstellige Kurznamen. Browser-Sichtprüfung der Tooltip-/Dropdown-Darstellung steht aus.

- Gesetzte Kurzlink-Optionen erhalten ein direktes Entfernen-X bei Hover oder Tastaturfokus; auf Touch-Geräten ist es dauerhaft sichtbar. Gültigkeit/Passwort werden im aktuellen Entwurf geleert, ein offenes Popover geschlossen und der Fokus zum jeweiligen Icon zurückgeführt. Beim Bearbeiten wird die Änderung wie andere Felder erst mit „Änderungen speichern“ übernommen. Entfernen ist eine separate Schaltfläche, keine verschachtelte Schaltfläche. Produktionsbuild erfolgreich; interaktive Browserprüfung steht aus.

- Kurznamen-Vorgaben speichern automatisch ohne Speicherbutton. Gültige Änderungen werden nach kurzer Eingabepause übernommen; Erfolg erscheint im vorhandenen Notification-Deck unten rechts. Speicheranfragen laufen nacheinander, damit ältere Antworten neuere Änderungen nicht überschreiben; schnelle Änderungen werden zusammengefasst. Ungültige Zwischenwerte der Stellenzahl werden nicht gesendet, Fehler als Notification gemeldet. Build erfolgreich; lokal 31 Tests bestanden, vier Linux-Prüfungen übersprungen. Neue Tests prüfen Zusammenfassung, Reihenfolge überlappender Änderungen, Fehler und Abbruch wartender Speicherungen. Interaktive Browserprüfung weiterhin offen.

- Entfernen-X präzisiert: Beim Zeitraum überlagert es bei Hover/Fokus nur den Wert; das Kalender-Icon bleibt zum Öffnen des Popovers bedienbar. Beim Passwort blendet das X rechts neben dem weiterhin bedienbaren Schloss ein. Auf Touch-Geräten stehen Wert und X nebeneinander; reduzierte Bewegung wird berücksichtigt. Build/Typprüfung erfolgreich; Browserprüfung steht aus.

- Kurzlink-Erstellformular nutzt die gesamte Breite der Liste (640-px-Begrenzung entfernt). Schloss und animiertes Entfernen-X liegen in einer gemeinsamen Pille; beide bleiben separate bedienbare Schaltflächen. Produktionsbuild erfolgreich; Sichtprüfung steht aus.

### Kopierbare Passwort-Pille und kompakter Kurzlinkeditor (6. November 2026)

- Schloss in der Kurzlinkliste nutzt dieselbe graue Pille wie Statistik und Ablauf. Klick kopiert das Passwort über einen ausschließlich authentifizierten Admin-Abruf mit Origin-Prüfung, Rate-Limit und `no-store`; Erfolg/Fehler über Notifications. Liste und normale Verwaltungsantworten enthalten weder Passwort noch Hash/verschlüsselten Wert. Alte reine Passwort-Hashes sind nicht rückrechenbar: einmal neu setzen, um das Kopieren zu ermöglichen. Keine Anzeige des Passworts neben dem Schloss.
- Migration 10 ergänzt die verschlüsselte Passwortablage (AES-256-GCM, zufälliger Nonce, Link-ID als authentifizierte Zuordnung). Prüfung des Passworts bleibt beim Hash. Der Server erzeugt/lädt `link-password.key` neben der Datenbank, privat mit Modus 0600; NAS-Entrypoint berücksichtigt die Eigentümerschaft der Schlüsseldatei. Schlüssel und Datenbank gemeinsam sichern. Bestehende verschlüsselte Werte verhindern ein unbemerktes Neuerzeugen des Schlüssels bei fehlender Datei; falsche Schlüssel werden beim Start abgewiesen. Bei Zugriff auf Datenbank und Schlüssel sind Passwörter wiederherstellbar; die Verschlüsselung ersetzt keinen Schutz des App-Datenvolumes.
- Bearbeitung zeigt Zieladresse, Kurzname und Optionen nebeneinander, soweit Platz reicht; bei Platzmangel umbrechend. Speichern als Disketten-Icon und Abbrechen als X mit zugänglichen Beschriftungen.
- Build erfolgreich; lokal 33 Tests bestanden und vier Linux-Prüfungen übersprungen. Unter Linux/Docker alle 32 Backend-Tests erfolgreich. Neue Tests prüfen privaten persistenten Schlüssel, Manipulations-/Linkbindungsprüfung, authentifizierten Abruf, Origin, Geheimhaltung in Listen, Altpasswörter und Entfernen/Ersetzen des Passworts. Browser-Zwischenablage-/Responsive- und reale NAS-Prüfung stehen aus. Änderungen lokal.

- Kurzlink-Editor enthält einen Löschen-Icon-Button mit Bestätigung. Der geschützte DELETE-Endpunkt löscht ausschließlich externe Kurzlinks und deren Ereignisse; der Kurzname ist danach wieder verfügbar. Datenfreigaben sind von diesem Endpunkt ausgeschlossen. Build erfolgreich; 34 Tests bestanden, vier Linux-Prüfungen übersprungen. API-Test prüft Authentifizierung, Origin, Löschung, Statistik und Schutz von Datenfreigaben; interaktive Browserprüfung steht aus.

- Gültigkeits- und Passwort-Popover: Schaltflächen zum Übernehmen und Entfernen sowie sichtbare „Gültig bis“- und Passworthinweistexte entfernt. Änderungen am Passwort und gültige künftige Datumseingaben werden unmittelbar in den Entwurf übernommen; Schließen per Außenklick oder Escape. Ein leerer oder ungültiger Datumszwischenstand überschreibt den bisherigen Wert nicht; das X entfernt ihn. Beim Bearbeiten werden Änderungen weiterhin erst mit dem Speichern-Icon dauerhaft. Build erfolgreich, 34 Tests bestanden, vier übersprungen; interaktive Browserprüfung steht aus.

- Gültigkeitspille an Passwortpille angeglichen: Kalender und Entfernen-X besitzen innerhalb der gemeinsamen Pille getrennte Hoverflächen. Produktionsbuild erfolgreich; visuelle und interaktive Prüfung steht aus.

- Gültigkeitspille verdichtet sich bei Hover/Fokus auf das Maß der Passwortpille; Kalender-Hintergrund mit symmetrischem Abstand, schmaleres X. Reduzierte Bewegung berücksichtigt. Build erfolgreich; Sichtprüfung steht aus.

- Gültigkeitspille: Beim Hover überlagert das X den Wertebereich, ohne zusätzliche Breite anzufügen; der Wertebereich schrumpft auf die Breite des X. Build erfolgreich; Sichtprüfung der Animation steht aus.

- Kurzlinkliste: Auf Ansichten bis 600 px stehen Kurzname und gekürzte Zieladresse in der ersten Zeile, Kennzahlen und Aktionen darunter. Zusätzlicher Kopier-Button entfernt; Kurzname kopiert weiterhin. Der später entfernte Aktivierungsschalter war zunächst in den Editor verschoben worden. Build erfolgreich, 34 Tests bestanden, vier übersprungen; responsive und interaktive Browserprüfung steht aus.

- Scope-Änderung: Separate Aktivierung/Deaktivierung entfällt für Kurzlinks, einschließlich API-Feld und Filteroption; Filter unterscheiden gültig und abgelaufen. Abgelaufene Links erhalten ein Hinweis-Symbol neben dem Kalender statt „Deaktiviert“. Migration 11 setzt bisher deaktivierte externe Links auf einen abgelaufenen Zeitpunkt, damit sie nicht unerwartet öffentlich erreichbar werden; ein neuer Ablauf oder „unbegrenzt“ macht sie wieder verfügbar. Freigaben behalten ihre eigene Aktivierung. Build und Tests erfolgreich; eine Migrationstestdatei prüft den Altzustand und den unveränderten Freigabestatus. Browserprüfung steht aus.

- Kurzlinkeditor: Löschsymbol gemäß bereitgestellter Vorlage mit animiertem Deckel und Korpus; Speichersymbol bei Hover/Fokus dezent animiert. CSS statt zusätzlicher Motion-Abhängigkeit; reduzierte Bewegung berücksichtigt. Build erfolgreich; visuelle Prüfung steht aus.

### Region, Zeitformat und Passwortkopie (6. November 2026)

- Einstellungsbereich „Region und Zeitformat“ ergänzt: Browser-Standard oder de-DE, en-GB, en-US; Zeitformat automatisch, 12 oder 24 Stunden. Vorgaben werden nach Eingabepause über authentifizierte API persistent gespeichert und im Notification-Deck bestätigt. Kurzlink-Gültigkeit bietet regionsabhängige Datumseingabe mit Kalender und separaten Stunden-/Minutenfeldern; bei 12 Stunden mit AM/PM. Plausible Zukunftszeit wird in die lokale Browser-Zeitzone interpretiert und als ISO-Zeitpunkt gespeichert. Ablauf-Tooltips, Statistikzeitpunkte und Dezimaldarstellung übernehmen die Vorgaben. Die bislang vorhandenen nativen Datumsfelder der Datenfreigaben bleiben browserabhängig; eine vollständig appweite Umstellung steht noch aus. Keine Auswahl einer Zeitzone implementiert.
- Kopierfehler eingegrenzt: Die vorhandene Vorschau auf Port 5173 bezog die API von einem vor der Passwortkopie gestarteten Backend ohne has_copyable_password; zwei geschützte Einträge hatten dieses Feld nicht. Der neue Entwicklungsstart verwendet Node-Watch für Backend-Änderungen; ein bereits gestarteter alter Entwicklungsserver muss einmal neu gestartet werden. Die Fehlermeldung unterscheidet diesen Zustand von nicht kopierbaren Altpasswörtern, die danach neu gesetzt werden müssen.
- Build und Tests erfolgreich: lokal 38 bestanden, vier Linux-Tests übersprungen. Neue Tests prüfen API-Autorisierung/Persistenz und Formate de-DE/en-US/en-GB, 12/24 Stunden und ungültige Eingaben. Isolierte lokale Entwicklungsinstanz mit eigener Datenbank: Einrichtung 201, Kurzlinkerstellung 201, Passwortabruf 200 und Testpasswort korrekt, Einstellungen 200 und korrekt zurückgelesen. Die Browser-Vorschau scheiterte zweimal mit Preview automation snapshot timed out; alternativer Computerzugriff meldete keinen verfügbaren Browser. Daher weder UI-Bedienung noch tatsächliches Schreiben in die Zwischenablage nachgewiesen. Kein realer Nutzerdatensatz verändert; der bestehende Entwicklungsserver wurde nicht gestoppt.

- Einstellungen: Kennzeichnung „Konfiguration“ und Einleitung zur öffentlichen Linkadresse entfernt; Hinweise zu Admin-Ursprung und Standardadresse stehen als zugänglicher Info-Tooltip hinter der Überschrift. Der Tooltip wird auch für Kurznamen wiederverwendet. Build erfolgreich; Sicht- und Interaktionsprüfung steht aus.

### Dateifreigaben an Kurzlink-Bedienung angeglichen (6. November 2026)

- Bei der Erstellung bleiben Datei-/Ordnerauswahl und Upload erhalten; Beschreibung und vorgeschlagener Kurzname stehen bei Platz nebeneinander. Gültigkeit und Passwort nutzen dieselben Icon-Popovers einschließlich Region/Zeitformat und Entfernen-X wie Kurzlinks, mit Einblenden und reduzierter Bewegung. Die Erstellen-Schaltfläche bleibt bei fehlender Auswahl oder laufendem Upload deaktiviert.
- Der Freigabe-Editor verwendet dieselben Gültigkeits-/Passwortoptionen und Icon-Buttons zum Speichern/Schließen. Bestehende Passwörter bleiben erhalten, solange sie nicht geändert oder entfernt werden. Die vorhandene 12-Zeichen-Regel für Freigabepasswörter wird im Popover angezeigt und beim Speichern geprüft; die separate Kurzlink-Regel bleibt unverändert. Bestehende abgelaufene Zeitpunkte werden beim Bearbeiten anderer Felder nicht erneut als neuer Ablauf gesendet. Der zusätzliche Kopier-Button in der Liste ist entfernt; der Kurzname kopiert weiterhin.
- Dateifreigaben behalten ihren vorhandenen Aktivierungsschalter und ihre bestehenden Schutz-/Dateisystemregeln. Passwortkopie und Löschen aus Kurzlinks wurden nicht auf Freigaben übertragen: deren Passwörter sind nicht wiederherstellbar gespeichert und eine Freigabelöschung benötigt eigene Semantik. Build erfolgreich; lokal 38 Tests bestanden und vier Linux-Tests übersprungen. Visuelle und interaktive Browserprüfung der Dateiauswahl, Optionen und Freigabeerstellung steht noch aus.

- Freigabeerstellung öffnet wie die Kurzlinkerstellung die Formularzeile anstelle von „Neue Freigabe“; X schließt sie und führt den Fokus zurück. Während eines Uploads ist Abbrechen gesperrt, damit kein laufender Transfer als abgebrochen erscheint. Auswahl und Entwurf bleiben beim Schließen wie bei Kurzlinks erhalten. Formular, Datei-/Ordnerauswahl und Linkoptionen bleiben funktionsfähig; die Zeile blendet nur ein und berücksichtigt reduzierte Bewegung.
- Speicherpfad als graue, einzeln anklickbare Breadcrumb-Pille; separater Button „Eine Ebene zurück“ entfernt. Ein gemeinsamer „Hochladen“-Button mit animiertem Hard-Drive-Upload-Symbol öffnet eine Auswahl für Dateien oder Ordner. Browser-Dateidialoge verwenden unterschiedliche Modi für Dateien und Ordner; deshalb stehen diese unter einem gemeinsamen Auslöser zur Auswahl. Quelle: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory
- Produktionsbuild erfolgreich, 38 Tests bestanden und vier Linux-Prüfungen übersprungen. Die interaktive Browserprüfung der Uploadauswahl, Tastatur-/Touchbedienung und responsiven Darstellung steht aus.

- Dateiauswahl: Quellen und Einträge kompakter ohne Trennlinien; Suche vorerst entfernt. „Diesen Ordner auswählen“ und „Sichtbare auswählen“ verwenden dieselbe kompakte Buttonformatierung wie „Hochladen“ mit Lucide-Ordner- beziehungsweise Dateistapel-Symbol. Ohne Suchfilter umfasst „Sichtbare auswählen“ alle Einträge des geöffneten Ordners; während des Ladens und bei leerem Ordner ist der Button deaktiviert. Build erfolgreich, 38 Tests bestanden und vier Linux-Tests übersprungen; Browserprüfung steht aus.

- Dateiauswahl: Fehlgeschlagene Ordnerabrufe werden dauerhaft als Fehler statt als leerer Ordner dargestellt; die Auswahl des nicht geladenen Ordners ist gesperrt. Ursache für lokale macOS-Entwicklungsstarts eingegrenzt: Der sichere, descriptorbasierte Quellzugriff setzt Linux und /proc/self/fd voraus. Das inzwischen ergänzte Linux-Backend im Entwicklungsstarter löst diese Einschränkung für den regulären Entwicklungsstart; insbesondere ist die Dateiliste auf dem nativen macOS-Backend damit weiterhin nicht nutzbar. Keine Abschwächung des Symlink-/Dateitypschutzes. Build und Tests erfolgreich (38 bestanden, vier Linux-Tests übersprungen); Browser- und NAS-Prüfung offen.

- Dateiauswahl: Pfad und Auswahlaktionen stehen bei ausreichender Breite nebeneinander und umbrechen bei Platzmangel; Upload folgt auf „Sichtbare auswählen“, „Ordner auswählen“ ist gekürzt. Abruffehler erscheinen über Notifications statt als Text im Picker. Build erfolgreich; visuelle Prüfung steht aus. Die zuvor dokumentierte macOS-Einschränkung bleibt offen.

- Upload auf nativem macOS eingegrenzt: Auch der sichere Schreibpfad benötigt Linux. Die API lehnt einen Upload bereits vor dem Anlegen eines Batch-Ordners ab; die Oberfläche meldet die Plattformgrenze per Notification. Der Entwicklungsstarter verwendet inzwischen ein Linux-Backend; nativer macOS-Schreib- und Lesezugriff bleibt nicht unterstützt. Build und Tests erfolgreich (38 bestanden, vier Linux-Tests übersprungen); tatsächlicher Browser-Upload nicht geprüft.

- Uploadanzeige teilweise umgesetzt: Der Upload-Button zeigt während der Übertragung einen rotierenden Kreis, anhand übertragener Bytes geschätzte Rate und Restzeit sowie einen Fortschrittsbalken. Reduzierte Bewegung wird berücksichtigt. XHR misst den Fortschritt mehrerer Dateien gemeinsam; die Anzeige erfasst gesendete Bytes und bestätigt nicht bereits deren dauerhafte Speicherung. Fortsetzung nach Unterbrechung ist weiterhin nicht implementiert: Der bestehende Endpunkt verwirft unvollständige Dateien; ein gesichertes Chunk-Protokoll mit konsistenter Wiederaufnahme und Prüfung der Dateizugehörigkeit bleibt offen. Native macOS-Vorschau unterstützt weiterhin keinen Upload. Build und Tests erfolgreich (38 bestanden, vier übersprungen); tatsächlicher Upload und Darstellung nicht im Browser geprüft.

- Speicherpfad: Der Einstieg zu den Speicherquellen verwendet platzsparend das vorhandene ShareLyze-Symbol mit Hell-/Dunkelvariante und zugänglicher Beschriftung. Build erfolgreich; Sichtprüfung steht aus.
- Speicherquellen-Symbol im Pfad auf 20 px vergrößert und in seiner Schaltfläche zentriert. Build erfolgreich; Sichtprüfung offen.

- Lokaler macOS-Entwicklungsstart: `scripts/dev-run.mjs` startet das Backend in Docker unter Linux und bindet Quellen lesend sowie Datenbank-/Uploadverzeichnis separat beschreibbar ein; der Backend-Port ist auf Host-Loopback veröffentlicht. Docker Desktop ist erforderlich, beim ersten Start wird das Image gebaut. Änderungen am Backend werden eingebunden; ein bereits laufender Entwicklungsstart muss neu gestartet werden. Isolierter API-Test mit eigener Datenbank: Einrichtung, Upload und anschließendes Auflisten erfolgreich; keine Browserprüfung oder NAS-Prüfung. Fortsetzbare Uploads bleiben offen.
- Upload-Button: Auslassungspunkte während Vorbereitung und Übertragung entfernt; Build erfolgreich.

- Freigabeauswahl: Ausgewählte Elemente erscheinen als segmentierte Pillen mit kurzem Datei-/Ordnernamen und X samt Bestätigungsdialog; Entfernen ändert nur die Auswahl. Bestehende Quellen zeigen Quelle und relativen Pfad im Tooltip. Bei neu hochgeladenen Elementen werden Anzahl und Gesamtgröße der erfolgreich übertragenen Dateien aus der Browserauswahl angezeigt; für bestehende Ordner wird keine rekursive Größenberechnung vorgetäuscht. Build und Tests erfolgreich (38 bestanden, vier Linux-Prüfungen übersprungen); Sicht- und Interaktionsprüfung im Browser offen.
- Ordnerinhalt ist auf die Höhe von etwa zehneinhalb kompakten Einträgen begrenzt und innerhalb der Liste scrollbar; bei umgebrochenen Namen variiert die sichtbare Anzahl. Build erfolgreich; Browserprüfung offen.
- Ordnerauswahl: Ordnernamen öffnen den jeweiligen Ordner direkt; Auswahl bleibt über eine separate Checkbox möglich. Backspace navigiert bei geöffneter Freigabeerstellung eine Ebene zurück bis zur Quellenübersicht und wird in Eingabefeldern und Dialogen nicht abgefangen. Build erfolgreich; interaktive Tastatur- und Browserprüfung offen.
- Freigabeerstellung: Umschaltung zwischen bestehenden Speicherquellen und Upload; die jeweils andere Auswahl bleibt beim Wechsel erhalten, wird aber nicht gemeinsam übermittelt. Während eines Uploads ist der Moduswechsel gesperrt. Uploadspeicher erscheint nicht als bestehende Quelle. Dateiname und Symbol bleiben in einer Zeile, soweit Platz reicht. Build und Tests erfolgreich (38 bestanden, vier Linux-Tests übersprungen); interaktive Browserprüfung offen.
- Freigaben: Abstand zwischen Liste und Erstellbereich verkleinert. Build erfolgreich; Sichtprüfung offen.
- Kurzlink- und Freigabelisten: vertikalen Innenabstand der Einträge reduziert; Bedienelemente behalten ihre Größe. Build erfolgreich; Sichtprüfung offen.
- Abstand zwischen Freigabezeile und Modusumschaltung verkleinert; Build erfolgreich, Sichtprüfung offen.

### Aufbewahrung, Vorschau-Cache und Speicherlayout (6. November 2026)

- **Umgesetzt:** Quellen ausschließlich durch unmittelbare Verzeichnisse/Mounts unter `/sources` (alternativ `SOURCES_ROOT`); Name aus Verzeichnisname, stabile IDs, bestehende IDs bei identischem Pfad erhalten. Entfernte Quellen inaktiv, wiederkehrende Pfade reaktiviert; Symlinks ignoriert. `SOURCES_JSON` wird nicht mehr verwendet, auch nicht im Entwicklungsstarter. Geänderte Containerpfade werden aus Sicherheitsgründen nicht automatisch bestehenden Freigaben zugeordnet; Übergang über gleichbleibenden Root/`SOURCES_ROOT` oder verifizierte Neuanlage.
- **Umgesetzt:** Ein Datenmount `/data` genügt; `config`, `database`, `uploads`, `previews` separat mountbar. Anwendungscode im Image unter `/app`, Schlüssel in config, Einstellungen in SQLite. Entrypoint bereitet private Bereiche für PUID/PGID vor, ohne Quellen anzufassen. Versionierte DB-Migration 13 ergänzt Lösch-/Bereinigungszeitpunkte. Legacy-Datenbank wird mit SQLite-Backup inklusive WAL übernommen, Schlüssel separat übernommen; Altdateien bleiben archiviert, Konflikte stoppen den Start. Details und Compose-Beispiele in DEPLOYMENT.md.
- **Umgesetzt:** Freigabelöschung mit sofortiger Sperre und Widerruf von Grants, Löschaktion in der Oberfläche; verzögerte Bereinigung eigener Uploads (ein Tag Vorgabe). Freigaben, Links und Items bleiben als historische Metadaten mit reservierten Slugs erhalten; Ereigniszuordnung bleibt intakt. Kurzlinklöschung archiviert bereits seit Migration 12.
- **Umgesetzt:** Einstellbare Statistikaufbewahrung (standardmäßig dauerhaft), Löschfrist, verwaiste Uploads und Cachefrist; explizites ANALYTICS_RETENTION_DAYS hat Vorrang und sperrt das Feld. Bereinigung beim Start und stündlich. Uploadbereinigung arbeitet nur mit privaten UUID-Batches, schützt laufende Uploads und jede weitere nicht bereinigte Referenz, auch deaktivierte/abgelaufene Freigaben. Quellen unverändert. Teilweise verwendete Batches bleiben vollständig erhalten.
- **Umgesetzt:** Persistenter JPEG-Vorschau-Cache mit serieller Hintergrundverarbeitung, Fortschritts-/Fehleranzeige und Belegungsanzeige, Vorbereiten/Leeren. Automatisch beim Start, stündlich, nach Erstellen/Bearbeiten und bei Zugriff. Cachezugriff prüft Quelle und Berechtigung; Fingerprint erkennt übliche Änderungen. Größenbudget 512 MiB (kurzzeitig durch laufende Arbeit überschreitbar), konfigurierbare Cachefrist, begrenzte Eingaben/Queue/Scan und Renderzeit. Jobs/Fortschritt sind flüchtig; Cache bleibt nach Neustart nutzbar.
- **Umgesetzt:** Zusätzliche einfache Vorschauen für TIFF, SVG als Raster (aktive/externe Inhalte abgewiesen), HEIF/HEIC soweit Decoder vorhanden und UTF-8-Textauszüge TXT/MD/CSV/JSON/log/YAML. Rastervorschau auch im Viewer; Originaldownload bleibt erhalten. HEIC hängt von libvips-Codecunterstützung ab; PDF/Office/Videotranscoding sind keine zugesicherte Vorschaufunktion. Bestehende Bild-/Videovorschauen erhalten.
- **Geprüft:** Produktionsbuild und Docker-Image erfolgreich; lokale Suite 42 bestanden / fünf Linux-Tests übersprungen, im Linux-Container alle 47 Tests bestanden. Neue Tests prüfen Fristen, gemeinsame Uploadreferenzen, laufende Uploads, Statistikerhalt, alte SQLite-/WAL-Daten samt Schlüssel, Quellenerkennung und deaktivierte/reaktivierte IDs sowie Cacheinvalidierung/SVG/Text. HTTP-Test umfasst Löschung und Aufbewahrungseinstellungen.
- **Geprüft:** `node scripts/verify-storage-layout.mjs sharelyze-storage-check` erstellt ausschließlich temporäre Daten/Container: ein Datenmount und vier getrennte Mounts unter PUID/PGID 1234, Quelle Fotos ohne SOURCES_JSON, SVG-Vorschaucache, Upload, sofortige Löschsperre, historische Statistikzuordnung und Neustart mit identischer Quellen-ID erfolgreich. Compose-Konfiguration validiert. Prüfcontainer/Daten anschließend entfernt; keine vorhandenen Nutzerdaten verwendet.
- **Offen zur Abnahme:** Interaktive Browser-/Tastatur-/Mobilprüfung der neuen Einstellungen/Löschaktion/Fortschrittsanzeige, Lastprüfung und echte NAS-ACL-/Deploymentprüfung. HEIC-Decodierung ist nicht garantiert. Keine erfolgreiche Sicherheits-Gesamtprüfung behauptet. Weitere bestehende MVP-Restpunkte außerhalb dieses Auftrags bleiben in ihren Abschnitten dokumentiert.

- Gültigkeitspille: Der ursprüngliche Hoverbereich bleibt beim Schrumpfen für die Zustandssteuerung erhalten; erst nach Verlassen dieses Bereichs und 350 ms wird der Hoverzustand aufgehoben. Keine zusätzliche überlagernde Klickfläche; reduzierte Bewegung bleibt berücksichtigt. Build erfolgreich; interaktive Hoverprüfung offen.
- Freigabeauswahl: Dateigröße und rekursive Ordnergröße mit Dateianzahl werden für bestehende Quellen über einen authentifizierten, descriptorbasierten API-Abruf ermittelt; Symlinks und Spezialdateien werden wie beim Browsen ausgelassen. Währenddessen erscheint ein Ladesymbol, bei Fehlern „Größe unbekannt“. Die Messung ist eine Momentaufnahme, bricht bei mehr als 100.000 Einträgen ab und gibt nur vollständige Ergebnisse aus; Uploads verwenden weiterhin die Größen erfolgreich übertragener Dateien. Build und lokale Tests erfolgreich; drei Linux-Storage-Tests inklusive verschachtelter Größen und Symlinkprüfung im Docker-Container bestanden. Browser- und NAS-Prüfung offen.
- Leere Freigabeliste zeigt „Noch keine Freigabe erstellt“; bei Filtern ohne Treffer bleibt der passende Hinweis bestehen. Build erfolgreich.
- Abstand zwischen Freigabeliste und Erstellbereich leicht auf 14 px erhöht; Build erfolgreich, Sichtprüfung offen.

### Upload-Ausschlüsse (6. November 2026)

- **Umgesetzt:** Unter Einstellungen → Upload-Filter eine dauerhaft in SQLite gespeicherte, standardmäßig aktive Ausschlussliste. Vorgaben: `.DS_Store`, `._*`, `Thumbs.db`, `desktop.ini`, `__MACOSX`, `.Spotlight-V100`, `.Trashes`. Regeln bearbeiten, Filter deaktivieren oder Standardregeln einsetzen und speichern. Bestehende Datenbanken erhalten die Vorgaben ohne Schemaänderung.
- Regeln sind einfache Namensmuster mit `*` und `?`, eine Regel je Zeile, ohne Pfade/Regex/Negation; höchstens 100 Regeln mit jeweils 128 Zeichen. Abgleich unabhängig von Groß-/Kleinschreibung auf jeder Pfadkomponente; passende Ordner schließen ihren Inhalt aus. Nicht pauschal alle versteckten Dateien ausschließen.
- Browser lädt die aktuellen Regeln vor jeder Uploadauswahl, überspringt passende Dateien vor Übertragung und zählt sie in der Abschlussmeldung. Nur verbleibende Dateien zählen zur 500-Dateien-Grenze, zu Größen und Freigabeauswahl. Sind alle ausgeschlossen, wird kein Uploadbatch angelegt. Serverseitig erneute Prüfung vor Verzeichnis-/Dateierstellung, Antwort `{skipped:true,reason:"ignored"}`; Änderungen während laufender Uploads werden auch im Browser als übersprungen behandelt. Bestehende Dateien und Quellen bleiben unverändert.
- Gemeinsamer, begrenzter Mustermatcher in `shared/upload-filter.ts` für Browser und Server; Docker-Build und Entwicklungsstarter binden das gemeinsame Modul ein.
- **Geprüft:** Build und lokaler Testlauf mit 45 bestandenen / sechs Linux-Tests übersprungen. Linux-Containerprüfung umfasst direkte Uploads von .DS_Store/AppleDouble/__MACOSX ohne Dateisystemreste, deaktivierten Filter, eigene Regeln, geschützte Einstellungen und persistente Werte nach erneutem Öffnen der Datenbank. Vollständige Linux-Suite: alle 51 Tests bestanden (inklusive Frontend-Unit-Tests); Docker-Image erfolgreich gebaut. Interaktive Browserprüfung und echter NAS-Upload bleiben offen.

- CI-Nachprüfung nach Veröffentlichung auf dev: Die bestehenden Containerprüfungen verwendeten noch SOURCES_JSON und eine feste Quellen-ID. Beide Fixtures an die authentifizierte automatische Quellenerkennung angepasst. Lokal mit isoliertem Linux-Image geprüft: 32 pausierte Downloads angenommen, der 33. mit 503 abgewiesen, Kapazität nach Verbindungsabbruch freigegeben; während Datei-/ZIP-Übertragung geänderte Inhalte nicht als abgeschlossen gezählt. Dies sind begrenzte Parallelitäts-/Integritätsnachweise, keine allgemeine Last- oder NAS-Freigabe. GitHub-Actions-Ergebnis separat am jeweiligen Commit prüfen.

### Statistik-UI: HTML-Entwürfe (6. November 2026)

- **Als Konzepte umgesetzt:** Drei eigenständige HTML-Entwürfe unter `docs/design/statistics-concepts/`: Insights-Dashboard, Analyse-Studio und Statistik-Report. Vorhandenes ShareLyze-CSS, Logo, oberes Icon-Menü und Lucide als Basis; Hell-/Dunkelmodus, responsive Layouts und ausdrücklich fiktive Beispielwerte. Produktive Statistikseite unverändert; Auswahl und Integration offen.
- **Lokale Demo:** 7-/28-Tage-Umschaltung, Verlaufskennzahl (Dashboard/Studio), Linksuche, Linkdetails und CSV-Export. Heatmap, Herkunft, Browseranteile und Vorperiodenvergleiche zeigen mögliche Zusatzanalysen; keine Behauptung bereits vorhandener API-Funktionen. Keine eindeutigen Besucher oder garantierte Speicherung aus Transferereignissen abgeleitet.
- **Geprüft:** HTML-Render-Vorschauen aller Varianten bei 1440 und 390 px, Report zusätzlich hell; skriptgestützte DOM-Prüfungen für Zeitraum, Suche/Leerzustand, Details, Theme und verfügbare Kennzahlumschaltung. Zwei mobile Grid-Überläufe korrigiert; abschließend kein Seitenüberlauf bei 390 px, Vergleichstabellen scrollen intern. CSV-Dateidownload, manuelle Tastatur-/Touch-/Screenreaderprüfung und API-Integration nicht geprüft. Details und Datenlimitationshinweise in der dortigen README.


### Erweiterte Aufrufstatistiken (6. November 2026)

- **Umgesetzt:** Zentrale Momentaufnahme für Weiterleitungen, Freigaben, Downloads/ZIPs. Schema 14 ergänzt details_json und einen Typ-/Zeitindex; vorhandene Ereignisse und Zuordnungen bleiben erhalten, historische Zusatzdaten bleiben leer.
- **Umgesetzt:** Normalisierte IPs, Adressbereich und Proxy-/Verbindungsdaten gemäß TRUSTED_PROXIES; Browser/OS/Versionen, Gerät/Hersteller/Modell, CPU/Engine, Bot-/KI-Hinweise, Sprache, HTTP-/Range-/Fetch-/Prefetch-Kontext und Client Hints. Keine Cookies, Authorization, Bodys oder Queries in neuen Erfassungsfeldern; Herkunft nur Origin. Keine GPS-/Fingerprint-Ermittlung.
- **Umgesetzt:** Lokale DB-IP City-/ASN-Auswertung mit ungefährem Standort und Netzorganisation. Einstellungen mit Installieren/Aktualisieren, Downloadstatus, Fehler und Datenstand. Kein Besucher-IP-Versand. Erstinstallation per Schaltfläche; danach monatliche Aktualisierung. Dateien unter CONFIG_ROOT/geoip, beschränkte Downloads mit validiertem/atomarem Ersatz. Fehler/private Adressen/fehlende Werte werden nicht als bekannte Standorte ausgegeben. CC-BY-4.0-Attribution sichtbar.
- **Umgesetzt:** Vollständige Historie vor Link-/Typ-/UTC-Datums-/Traffic-/Suchfilter; Einzelabrufe in 50er-Seiten, Tages-/Stundenverlauf, zehn häufigste Länder/Städte/Geräte/OS/Browser/Netze/Referrer/IPs und gefilterte Dateistatistik. Geschützter JSONL-Streamingexport. Passwortseiten, Freigabe-Kurzlinksprung, HTML-Landung und Fehlversuche getrennte Ereignisse; keine behaupteten eindeutigen Personen.
- Bibliotheken: UAParser.js 2 (AGPLv3), maxmind/mmdb-lib und ipaddr.js (MIT); Originalpaket-Lizenzhinweise erhalten. Details, Grenzen und Herkunft: docs/ANALYTICS.md.
- **Geprüft:** Produktionsbuild und Docker-Image erfolgreich; vollständige Linux-Suite 55 Tests bestanden. Neue Tests prüfen Erfassung/Client Hints, Vertrauen in Proxy-IPs, Ausschluss von Cookies/Authorization/Queries, Bots, vollständige Filter/Aggregationen, 50er-Pagination, geschützten Streamingexport und Migration bestehender Ereignisse von Schema 13 auf 14. Echter MMDB-Leser mit kleinen MaxMind-Testfixtures: Stadt/Koordinaten/ASN, Ausschluss privater IPs, kontrollierter gzip-Download/Validierung/Installation, Neustart und Erhalt gültiger Dateien bei beschädigtem Download erfolgreich.
- **Geprüft:** Isolierte Containerstarts mit einem und vier separaten Datenmounts, PUID/PGID, Quellen/Upload/Cache/Löschung/Statistik/Neustart; 32 pausierte Downloads und Freigabe der Kapazität nach Abbruch; geänderte Datei-/ZIP-Streams nicht als abgeschlossen gezählt. Dependency-Audit ohne bekannte Produktionslücken. Das ist keine allgemeine Last-/Sicherheitsfreigabe.
- **Offen:** Vollständige aktuelle DB-IP-Monatsdatei und produktiver Download, Browser-/Mobil-/HTTPS-Client-Hints sowie echtes NAS-/Reverse-Proxy-Verhalten. Keine interaktive Browserprüfung dieses produktiven Umbaus durchgeführt; parallele HTML-Entwurfsprüfungen sind davon getrennt. Änderungen dieses Ausbaus lokal, noch nicht veröffentlicht.


### Statistik-UI: interaktive Vertiefung des bevorzugten Entwurfs (6. November 2026)

- **Entwurfsentscheidung:** Nutzer bevorzugt das Insights-Dashboard (`docs/design/statistics-concepts/01-insights.html`). Dieses als HTML-Prototyp um interaktive Diagrammwerte und eigene Freigabe-/Kurzlinkstatistiken erweitert. Kein Auftrag zur produktiven Integration aus dieser Auswahl abgeleitet.
- **Demo umgesetzt:** Fadenkreuz/Werte per Pointer oder Range-Regler, Modal mit Linkwechsel und passenden Kennzahlen, 28/7 Tage, Stundenansicht eines Datums und direkter Tagesvertiefung. Live-Demo mit rollendem 90-Sekunden-Fenster, 3-Sekunden-Intervallen, Ereignisliste, Aktualisierungszeit und Pause/Fortsetzen. Timerabbau beim Schließen. Live ausdrücklich simuliert, keine Serververbindung; Kurzlinks nur mit Weiterleitungen. Andere Entwürfe unverändert.
- **Geprüft:** JS-Syntax und HTML-Render-Vorschauen 1440/390/728 px; skriptgestützte DOM- und kontrollierte Timerprüfungen für Auswahl, Tagesvertiefung, Linkwechsel, Kennzahlen, Live/Pause/Fortsetzen sowie Schließen/Timerabbau bestanden. Kein Seiten-/Dialogüberlauf bei 390 px. Physische Touchbedienung, vollständige manuelle Tastatur-/Screenreaderprüfung und echte Datenanbindung offen. Parallele produktive Analytics-Änderungen nicht Teil dieser Prüfung.

### Statistik-Design: privater Nutzungskontext (6. November 2026)

- **Neue bestätigte Leitlinie:** ShareLyze wird primär privat für Familie/Freunde genutzt; sehr wenige Aufrufe über lange Zeit. Absolute Ereigniszahlen, ruhige Phasen und einzelne Abrufe sind wichtiger als Wachstums-/Business-Dashboards. Einzel-Link-Ansichten bündeln Aufrufe, Downloadstarts und Serverabschlüsse in einem gemeinsamen interaktiven Graphen; ergänzende Metriken und Details darunter.
- **Konzepte umgesetzt:** `docs/design/private-statistics/` enthält drei neue Richtungen mit je separater Übersicht und Einzel-Link-HTML: Ruhiger Überblick (gemeinsame Balken), Abruf-Tagebuch (Ereignisspuren), Langzeit-Album (Kalender plus kumulierte Einzel-Link-Verläufe). Alle verwenden denselben kleinen fiktiven Ereignisdatensatz; keine neue Variante ausgewählt, frühere Entwürfe erhalten.
- **Demo:** 90/30/7 Tage, Tag/Stunden, Graph-Auswahl und Mehrfachmetriken, Kalender, Linkwechsel, separate Abrufdetails und Geräteangaben, Hell/Dunkel sowie ausdrücklich simuliertes Live mit Pause. Kein Rückschluss auf konkrete Familienmitglieder, eindeutige Personen oder gespeicherte Dateien.
- **Geprüft:** JS-Syntax, Renderansichten aller sechs Einstiege bei 1200 px, drei Detailkonzepte mit Navigation bei 390 px, eine helle Ansicht. Skriptgestützte DOM-Prüfungen für Summen, Nulltage, Drilldown, Metrik-/Linkwechsel, Kalender, Theme und Seitenbreite bestanden; kontrollierte Live-Ticks und Pointerauswahl geprüft. Kein horizontaler Seitenüberlauf bei 390 px. Echte Touch-/vollständige manuelle Tastatur-/Screenreaderprüfung und produktive API-Anbindung offen. Details in der Konzept-README.


### QR-Codes für Kurzlinks: visuelle Konzepte (6. November 2026)

- **Angefragt:** Neuer Header-Menüpunkt „QR-Codes“ mit passendem Symbol, QR-Erstellung für bestehende Kurzlinks, optionale Kampagneninfos und verschiedene Gestaltungen.
- **Konzeptionell ausgearbeitet:** Drei separate Bildentwürfe unter `docs/design/qr-code-concepts/`: QR-Werkbank (Formular/Vorschau), Kampagnen-Sammlung (gruppierte Liste/Details), Design-Atelier (große Vorschau/Werkzeuge). Bestehenden Header und ShareLyze-Stil beibehalten; Lucide `QrCode` zwischen Kurzlinks und Statistiken vorgeschlagen. Keine Variante ausgewählt, keine produktive Integration.
- **Vorgeschlagen, noch offen:** Persistente QR-Varianten mit eigener Kurzadresse zur Zuordnung, interne Kampagnenfelder versus optionale UTM-Weitergabe, Designvorlagen/Logo/Rahmen und PNG-/SVG-Export. Lebenszyklus, Weiterleitungsschutz, Bibliothekslizenz und Exportregeln vor Implementierung klären. QR-Link-Aufrufe sind keine belegten Kamerascans. Details und Einschränkungen in der Konzeptdatei.
- **Nachweis:** Drei illustrative Bildentwürfe erzeugt und visuell gesichtet, auf bestehenden lokalen Designbildern sowie aktuellen Header-/CSS-/Logoquellen aufgebaut. Kein funktionsfähiger Generator und keine API-, Scan-, Browser-, Mobil-, Sicherheits- oder NAS-Prüfung. Die bestehende Anwendung wurde durch diese Konzeptarbeit nicht verändert.

### Statistikseite: kumulierter Verlauf und Ereignislog integriert (6. November 2026)

- **Ausgewählt und produktiv implementiert:** „Was über die Zeit zusammenkommt“ aus dem Langzeit-Album. `Statistics.tsx` nutzt die vorhandene Analytics-API mit gemeinsamem kumuliertem Graphen (`StatisticsChart.tsx`), Standard 90 Tage, 30/7 Tage, Datum mit Stunden, frei gewähltem Zeitraum bis 366 Tage und Live-Ansicht des heutigen UTC-Tags. Live fragt echte Daten alle 30 Sekunden ab, pausierbar und ohne Hintergrundtab-Polling; kein WebSocket-/sekundengenauer Stream.
- Mehrere unabhängige Kurven für Freigabeansichten, Downloadstarts und Serverabschlüsse; Weiterleitungen und ZIP-Starts/-Abschlüsse bei vorhandenen Werten separat. Kein Zusammenzählen unterschiedlicher Navigationsereignisse als Personen. Nullintervalle werden aufgefüllt, kumuliert ausschließlich seit Zeitraumstart. Maus/Pointer, Range-Regler und Tastaturauswahl; responsive SVG-Koordinaten für lesbare mobile Beschriftung.
- Graphauswahl grenzt nur das paginierte Ereignislog auf einen UTC-Tag/eine Stunde/eine Minute ein. Zeitraum/Link/Traffic/Suche gelten für Graph und Log; Ereignisart zusätzlich nur für das Log. Auswahl aufhebbar, Tagesauswahl zum Stundenverlauf vertiefbar. JSONL-Export übernimmt exakt die Logfilter. Details der vorhandenen Momentaufnahmen erhalten und um bereits verfügbare Übertragungs-/Diagnose-/Client-/Qualitätsdaten sowie vollständige gespeicherte Momentaufnahme ergänzt. Historische Lücken bleiben unbekannt.
- Eigener authentifizierter `/api/analytics/timeline`-Endpunkt liefert vollständige Zeitgruppen statt der gekappten 730-Gruppen-Liste des alten Reports. Zeitraum auf 366 Tage begrenzt; Stunden/Minuten auf einen UTC-Tag. `since`/`until` als validierte UTC-ISO-Grenzen für Ereignisse/Export ergänzt (Start inklusive, Ende exklusiv). Bestehende Report-/Datei-/Toplisten bleiben erhalten und erscheinen unter aufklappbaren weiteren Auswertungen. Andere laufende Telemetrieänderungen nicht Teil dieses Auftrags.
- **Geprüft:** Produktionsbuild erfolgreich; lokale Suite 52 bestanden, sechs plattformabhängige Tests übersprungen. Neue Tests prüfen 900 Zeitgruppen ohne Abschneiden, Linkfilter, Authentifizierung, exklusive Zeitgrenzen und Export, Stundenaggregation, ungültige Bereiche sowie Nulltage und kumulierte Summen. Echte React-Komponente isoliert mit Fetch-Fixtures gerendert (1200/390 px); skriptgestützte Prüfung von Kurvenumschaltung, Details, Graph-zu-Log-Anfrage und gefiltertem Exportlink bestanden. 390 px ohne Seitenüberlauf. Kein vollständiger Live-Backend-Browserlauf, physischer Touch-/Screenreader-, Last- oder NAS-Nachweis. Kein Commit/Push/Deployment in diesem Auftrag.


### Übertragungsqualität, Browserkontext und Kampagnen (6. November 2026)

- **Umgesetzt:** Übertragungskennung, Bytezahl, erwartete Bytes, Dauer und Datenrate für Dateien/ZIPs sowie Vorschau-/Medienantworten. Genau ein Abschluss-/Abbruch-/Fehlerereignis pro gemessenem Versuch. Range-/Wiederaufnahmeversuche, erneute Anfragen nach dokumentiertem Fehler/Abbruch im gleichen Besuch und Rückfall auf Vollantwort getrennt erkennbar; Medien-Range nicht als sichere Downloadwiederaufnahme ausgegeben.
- **Umgesetzt:** Strukturierte Logs mit beobachteter Situation, begrenztem Systemcode und möglichen Gründen für Verbindungsende, geänderte/fehlende/gesperrte Quellen, Format-/Vorschau-/Sicherheits- und Kapazitätsgrenzen. Keine rohen Fehlertexte/Stacks/Hostpfade. Endzustände und Fehler nach Geräte-/OS-/Browser-/Netz-/Dateiendungsgruppen auswertbar; Server- und Browsermeldungen nicht zu eindeutigen Vorfällen umgedeutet.
- **Umgesetzt:** Kurzlebige Freigabeaufruf-Zuordnung (Schema 15, public_visits, nur Tokenhash, acht Stunden, auf Link beschränkt), validierte/ratebegrenzte Clientmeldungen. Browser-Zeitzone zusammen mit Land/IP, Touch neben Gerät/OS, Hell/Dunkel und anfängliche Ansicht. Bewusste Ansichtswechsel getrennt von der Vorgabe. Erstes Ansichtsereignis nur um zugehörige Clientangaben ergänzt, passive Momentaufnahme erhalten. Keine dauerhaften Besucher-Cookies.
- **Umgesetzt:** Navigation-/Resource-Timing und Bild-/Medienfehler aus der öffentlichen Seite; Server-Antwort-/Ressourcenzeiten getrennt von Browserwerten. Fehlende Werte bleiben unbekannt. Sofortige externe Weiterleitungen erhalten keine künstliche JS-Zwischenseite; dort bleiben diese Browserfelder unbekannt.
- **Umgesetzt:** UTM-Allowlist (Quelle/Medium/Kampagne/Inhalt/Begriff, max. 100 Zeichen), Weitergabe bei Freigabe-/Passwortnavigation und Zuordnung zu Folgeereignissen. Optionaler Linkgenerator mit lokalem QR-PNG (qrcode, MIT), Kampagnenvergleich und Filter. QR-Kennzeichnung beweist keinen physischen Scan.
- **Umgesetzt:** UTC-Wochentag-/Stundenheatmap mit Nullwerten, getrennten Aufruf-/Alle-Ereigniswerten; Qualitäts-/Kontext-/Kampagnendetails aufklappbar in der parallel erweiterten privaten Statistikoberfläche. Bestehende lokale Design-/Grapharbeiten erhalten.
- Grenzen und Ereignisbedeutung dokumentiert in docs/ANALYTICS.md. Bytezahl/Datenrate sind serverseitige Streammessungen inklusive Vorbereitung/Puffergrenzen, kein Empfangs- oder Speichernachweis. Mehrere Teile einer Datei sind keine eindeutigen Dateidownloads. Ein Prozessabsturz kann nur einen Start ohne Abschluss hinterlassen; keine erfundene Diagnose.
- **Geprüft:** Produktionsbuild und Linux-Docker-Image erfolgreich; 57 lokale Tests bestanden, sechs Linux-Tests übersprungen; im Linux-Container alle 63 Tests ohne unbehandelte Fehler bestanden. Neue Tests: terminales Ereignis genau einmal, Persistenzfehler ohne Streamabsturz, Range-/If-Range-Fallback, erneuter Versuch nach Fehler, valide/abgelehnte Clientkontexte, Besuchs-/Linkbindung, Ablauf/Ratebudget, keine Token/freien Query-/Fehlertext-Geheimnisse in Ereignissen, Kampagnenfilter/-vergleich, QR-PNG und Weitergabe bei Freigabe-/Passwortnavigation, Browser-Helper mit kontrollierten Performance-Fixtures und sauberem Abbau. Das Linux-Storage-Fixture wartet vor DB-Schließung ausdrücklich auf den gespeicherten letzten Übertragungsabschluss.
- **Geprüft:** Echte isolierte Containerstreams: 32 pausierte Downloads angenommen, 33. mit 503 abgewiesen; nach Verbindungsende 32 strukturierte Abbruchlogs mit Teilbytes/Dauer und mehreren möglichen Ursachen, Kapazität freigegeben. Geänderte Datei- und ZIP-Streams als source_changed protokolliert und nicht als erfolgreich abgeschlossen gezählt. Ein-/Vier-Mount-Start mit Upload/Cache/Löschung/Neustart weiterhin erfolgreich. Produktions-Dependency-Audit ohne bekannte Lücken.
- **Offen:** Eigene interaktive Browser-/Touch-/Responsive-/Screenreaderprüfung der neuen Telemetrie-/Kampagnen-/Heatmap-Bereiche und reale Browsermessungen über HTTPS; echte NAS-/Proxy-/Netzunterbrechungsprüfung. Keine allgemeine Last-/Sicherheitsfreigabe. Parallele Statistik-Design-/Graphprüfungen sind eigenständige Nachweise. Änderungen lokal; kein Commit/Push oder Deployment in diesem Auftrag.

### Vertrauenswürdige Proxys in den Einstellungen

- **Umgesetzt:** Administratoren können Proxy-IP-Adressen und CIDR-Netze persistent eintragen; Änderungen gelten sofort für Express, Statistik und Rate-Limits. Eine nichtleere Umgebungsvariable `TRUSTED_PROXIES` hat Vorrang. Die direkt verbundene Adresse wird zur Orientierung angezeigt und nicht automatisch als vertrauenswürdig übernommen. Weitergeleitete Adressen setzen korrekt konfigurierte Proxy-Header und eine vollständig eingetragene vertrauenswürdige Proxy-Kette voraus; bestehende Ereignisse bleiben unverändert.
- **Geprüft:** Produktionsbuild sowie gesamte lokale Testsuite (72 bestanden, 6 übersprungen); zusätzlicher HTTP-Test für Authentifizierung, Origin-Schutz, Validierung, gefälschte Header, Proxy-Ketten, Persistenz, Überschreibung durch Umgebungsvariable und Entfernung der Freigabe.
- **Offen:** Interaktive Browserprüfung und Betrieb hinter dem tatsächlichen Reverse Proxy bzw. NAS; dessen direkte Adresse und Header-Konfiguration müssen vor Ort überprüft werden.


### QR-Werkbank: weitere Designvarianten (6. November 2026)

- **Bestätigte Richtung:** Nutzer bevorzugt die erste QR-Werkbank und wünscht weitere unterschiedliche Konzepte mit Einstellungen links und Vorschau rechts. Keine Freigabe zur produktiven Umsetzung daraus abgeleitet.
- **Als Bildentwürfe ausgearbeitet:** Kompakte Werkbank (direkte Einstellungszeilen), Geführte Werkbank (drei Schritte mit dauerhafter Vorschau), Vorlagen-Werkbank (Vorlagen/Anpassen/Kampagne). Bilder `04` bis `06` und aktualisierte Konzeptdatei unter `docs/design/qr-code-concepts/`. Alle bauen auf dem tatsächlich ausgewählten ersten Bild auf. Endgültige Variante offen.
- **Stand korrigiert:** Parallel existieren inzwischen UTM-Allowlist, Kampagnenzuordnung und einfacher lokaler QR-PNG-Generator in der Statistik. Diese zweite Runde nutzt diese Grundlage, ohne neue QR-Slugs vorauszusetzen. Eigene QR-Adressen aus Runde eins sind lediglich eine frühere unbeschlossene Alternative. Persistente Gestaltungen, SVG-/Druckexport und der eigene Headerbereich sind durch die Bildentwürfe nicht implementiert.
- **Geprüft:** Drei generierte Desktop-Bilder visuell gesichtet, Bilddateien lokal abgelegt. Keine neuen produktiven Änderungen, keine Interaktions-, Scan-, Browser-, Mobil-, Sicherheits- oder NAS-Nachweise. Illustrative Inkonsistenzen in der Konzeptdatei festgehalten.

### Statistikseite: Aktivitätskalender integriert (6. November 2026)

- **Umgesetzt:** Zusätzliche Sektion „Tage, an denen etwas passiert ist“ zwischen Kennzahlen und Ereignislog. Monatskalender mit Montag als Wochenbeginn, regionsabhängigen Monats-/Wochentagsnamen, Monatsnavigation innerhalb des gewählten Zeitraums und gesperrten Tagen außerhalb der Auswahl. Verwendet dieselben gefilterten Zeitreihendaten wie der Graph; keine zusätzliche API und keine personenbezogenen Zählungen.
- Farbmarkierungen für Freigabeansichten, Downloadstarts, Serverabschlüsse und bei vorhandenen Werten Weiterleitungen/ZIP-Ereignisse. Weitere Ereignisarten erhalten eine eigene Markierung, sodass reine Fehler-/Diagnosetage nicht verschwinden. Zahl pro Tag zählt alle Ereignisse; ruhige Tage bleiben auswählbar. Stunden-/Minutenzeilen werden zu UTC-Tagen zusammengefasst.
- Klick auf einen Tag setzt den Log-/Exportfilter auf den ganzen UTC-Tag, unabhängig von der aktuellen Graphauflösung. Separate Auswahldauer verhindert versehentliche Stunden-/Minutenfilter beim Kalenderklick. Vorhandene Zeitraum-/Link-/Traffic-/Such-/Kampagnenfilter bleiben wirksam.
- **Geprüft:** Produktionsbuild und drei gezielte Tests erfolgreich (Zeitreihen plus Tagesaggregation inklusive exklusiver Endgrenze und weiterer Ereignisarten). Echte React-Seite mit isolierten Fetch-Fixtures bei 1200/390 px gerendert; skriptgestützte Tagesauswahl, 24-Stunden-Exportgrenze, aktive Markierung und Seitenbreite geprüft, kein horizontaler Überlauf. Keine neue Live-Backend-/physische Touch-/Screenreaderprüfung und kein Deployment.


### QR-Codes: geführte Werkbank integriert (6. November 2026)

- **Ausgewählt und lokal implementiert:** Variante 2 der zweiten Runde (`05-gefuehrte-werkbank.png`). Eigener Header-/Mobilmenüpunkt mit Lucide `QrCode` zwischen Kurzlinks und Statistiken; Route `#qrcodes`. Drei frei anwählbare Schritte „Link & Kampagne“, „Gestalten“, „Export“ mit bestehendem `share-mode-toggle`-Muster. Persistente Vorschau rechts, auf schmalen Seiten unter den Einstellungen. QR-Modul wird erst beim ersten Öffnen geladen.
- **Umgesetzt:** Vorhandene Kurzlinks/Freigaben auswählen, konfigurierte öffentliche Adresse verwenden; optionale Kampagne/Quelle/Medium/Variante über bestehende UTM-Semantik. Keine neuen Slugs oder Änderung bestehender Ziele/Zugriffsschutzregeln. Eckige/abgerundete Datenmodule, Vorder-/Hintergrundfarbe, Logo, Beschriftung und Rahmen. **Nutzerwunsch: standardmäßig reines Schwarz `#000000` auf Weiß.**
- **Export:** Gemeinsame SVG-Darstellung für Vorschau und Download, PNG per Browser-Canvas mit 512/1024/2048/4096 px Breite, Seitenverhältnis inklusive Beschriftung erhalten. Kontrast mindestens 4,5:1 bei dunklen Modulen auf hellem Grund; Ruhezone vier Module, zusätzlicher Rahmenabstand, hohe Fehlerkorrektur H. Logos lokal als begrenztes Raster-PNG normalisiert, keine externen Bildverweise/aktiven SVGs. Keine Übertragung an einen QR-Dienst.
- **Bewusster Umfang:** Ein Entwurf bleibt beim Schritt-/Menüwechsel während der angemeldeten Sitzung erhalten; keine Datenbank-/Neuladepersistenz oder gespeicherte QR-Sammlung. Bestehender einfacher Statistikgenerator bleibt erhalten. Details, Grenzen und Lizenzzuordnung in `docs/design/qr-code-concepts/CONCEPT.md`.
- **Geprüft:** Produktionsbuild erfolgreich, einschließlich separatem QR-Chunk. Abschließende lokale Suite: 60 Tests bestanden, sechs plattformabhängig übersprungen. Neue Decoderprüfung mit jsQR (Apache-2.0, nur dev): 24 SVG-Rastervarianten bei 512/1024 px, kurze/längere Kampagnenadressen, eckige/runde Module, Logo/Rahmen/Beschriftung ergeben jeweils die vollständige URL. Tests für Farb-/Logo-Injektion, Kontrast und URL-Semantik. Happy-DOM mit echter React-Komponente: Kampagnenfeld, freie Toggle-Wechsel, Eingabeerhalt, SVG-Dateiname/-Inhalt, identische Vorschau/Export, ungültiger Kontrast und Leerzustand bestanden. Ein vorheriger Gesamtlauf meldete einen unveränderten Telemetrie-Range-Testfehler; im abschließenden Lauf bestand dieser ohne Backendänderung. Keine behauptete Ursachenbehebung.
- **Offen:** Visuelle Desktop-/Mobil-/Hell-/Dunkelabnahme, native Logoauswahl, Browser-Canvas-PNG-/Dateidownload, Tastatur/Screenreader, physische Scan-/Druckprüfung. In-App-Browser meldet „The browser access host is unavailable“; deshalb Design-QA ausdrücklich blockiert in `design-qa.md`, keine visuelle oder NAS-/Sicherheitsfreigabe. Kein Commit, Push oder Deployment in diesem Auftrag.

### CI: Downloadabschluss vor vollständiger Auslieferung absichern (7. November 2026)

- **Fehlerbild:** Checks-Lauf `42297604123` scheiterte im Linux-Freigabetest am fehlenden `transfer_finished`; Docker-Lauf `42297604197` las im Telemetrie-Range-Test den vorherigen Abschluss (3 statt 10 Bytes). Beides war von der Reihenfolge zwischen letztem Datenblock, Dateiende und HTTP-Verbindungsende abhängig.
- **Ursache nachgewiesen:** Bei bekannter Content-Length konnte der Client bereits alle Bytes empfangen und die Verbindung schließen, bevor `ReadStream` EOF gemeldet und der Server den abschließenden Dateistat geprüft hatte. Ein kontrollierter HTTP-Regressionstest hält EOF zurück: Mit dem bisherigen Containercode ist der Client dann fälschlich bereits fertig; mit der Korrektur wartet er auf die Prüfung.
- **Korrigiert:** `verifiedTail` hält bei Einzeldateidownloads den letzten Quellblock zurück, prüft beim Flush die vorhandenen Integritätsmerkmale und gibt erst danach den Rest frei. Quellblockgröße explizit 64 KiB; keine vollständige Kopie oder Archivierung. Bei Änderung/Lesefehler wird der zurückgehaltene Block verworfen und die Antwort abgebrochen; Dateideskriptor/Streams werden beim HTTP-Ende geschlossen. Range-, Zugriffsschutz- und Kapazitätsregeln bleiben wirksam. Tests oder Workflowbedingungen wurden nicht abgeschwächt.
- **Geprüft:** Produktionsbuild und neues Docker-Image erfolgreich. Lokal 63 Tests bestanden/sechs Linux-Tests übersprungen; im Linux-Container sämtliche 69 Tests bestanden. Neue Tests prüfen Ein-/Mehrblock- und Leerdateien, Prüfung vor Freigabe der letzten Bytes sowie Verwerfen bei Integritätsfehler. Regression nachweislich rot mit altem Code/grün mit neuem. Echte isolierte Containerprüfungen: 32 pausierte Downloads, 33. abgewiesen, Kapazität nach Abbruch frei; 32 strukturierte Abbruchlogs. Während Datei-/ZIP-Transfer veränderte Quellen nicht als abgeschlossen gezählt, mit `source_changed` protokolliert.
- **Veröffentlichung:** Fix für `dev`; tatsächliche GitHub-Actions-Ergebnisse am Fixcommit separat prüfen. Keine allgemeine Last-/Sicherheits-/NAS-Abnahme aus diesen Nachweisen ableiten.

### QR-Code: weiche zusammenhängende Formen (9. November 2026)

- **Umgesetzt:** Im Stil „Weich“ verbinden sich benachbarte dunkle Module an ihren gemeinsamen Kanten; außenliegende Ecken bleiben gerundet. Erkennungsmuster, Ruhezone, Farben und gemeinsame SVG-/PNG-Grundlage bleiben erhalten.
- **Geprüft:** Produktionsbuild und bestehende QR-Decoderprüfungen erfolgreich (24 Kombinationen). Browserseite aufgerufen; der Stilwechsel und echte Smartphone-/Druckscans wurden nicht interaktiv geprüft.

### QR-Gestaltungsvorlagen: zutreffende Vorschauen (9. November 2026)

- **Umgesetzt:** Die Vorschaubilder für Klar und Weich verwenden den aktuellen QR-Link und die gewählten Farben mit der jeweiligen Modulform. „Mit Logo“ zeigt ein vorhandenes eigenes Logo in der generierten Vorschau; ursprünglich wurde das ShareLyze-Symbol nur beispielhaft angezeigt, inzwischen ist es der Standard beim Auswählen der Vorlage (siehe unten). Bei ungültiger Farbkombination bleibt eine neutrale Beispielvorschau sichtbar.
- **Geprüft:** Produktionsbuild erfolgreich. Die Entwicklungsseite war erreichbar; eine Sichtprüfung des Vorlagenzustands blieb offen, da die aktive Annotationsoberfläche den Klick abgefangen hat. Logoauswahl und tatsächlicher Export wurden nicht interaktiv geprüft.

### QR-Code: Kontextangaben kompakt (9. November 2026)

- **Umgesetzt:** Der erste Schritt heißt „Link & Kontext“. Die Kontextfelder sind standardmäßig eingeklappt und können separat geöffnet werden; ihre Werte bleiben beim Schrittwechsel erhalten. Medium bleibt auch im eingeklappten Zustand standardmäßig `qr` und geht in den erzeugten Link ein. Ein zugänglicher Info-Hinweis erklärt die Auswertung nach Anlass/Verbreitungsweg und die öffentliche Sichtbarkeit der Angaben.
- **Geprüft:** Produktionsbuild erfolgreich. Browser-Snapshot der laufenden Entwicklungsseite konnte wegen eines Timeouts nicht abgeschlossen werden; interaktive Prüfung von Aufklappen, Tooltip und Schrittwechsel steht aus.

- **Gestaltungsanpassung:** Den sichtbaren Zusatz „optional“ neben „Kontext“ auf Nutzerwunsch entfernt; Funktion und Standardwert bleiben erhalten.
- **Gestaltungsanpassung:** Den Hinweis zu lokaler Vorschau/Export und Schrittwechsel unter der QR-Vorschau auf Nutzerwunsch entfernt.

### Header-Navigation: aktive Pille ausgerichtet (9. November 2026)

- **Korrigiert:** Ausgangsposition des aktiven Hintergrunds von 7 auf 6 px angepasst; sie entspricht nun dem Innenabstand der Navigation.
- **Geprüft:** Im vorhandenen Browser bei aktivem QR-Menüpunkt liegen Pille und Schaltfläche auf denselben Koordinaten (0 px Abweichung, 42 × 38 px); Abstände aller fünf Navigationspunkte jeweils 46 px. Produktionsbuild erfolgreich. Andere Ansichten wurden nicht einzeln angeklickt.

- **QR-Navigation:** Die Zurück-Schaltflächen auf Nutzerwunsch entfernt. Alle drei Schritte bleiben über das Toggle direkt anwählbar; anschließend wurden auf Nutzerwunsch auch die Weiter-Schaltflächen samt Aktionszeile entfernt.


### QR-Code: ShareLyze-Symbol als Logo-Vorgabe (9. November 2026)

- **Umgesetzt:** „Mit Logo“ aktiviert ohne Dateidialog das ShareLyze-Symbol. Ein ausdrücklich hochgeladenes PNG/JPEG/WebP ersetzt die Vorgabe und bleibt beim Wechsel zwischen den Vorlagen für erneute Auswahl erhalten; das Entfernen des Logos verwirft die eigene Auswahl. Vorschau und Exporte verwenden das eingebettete PNG identisch. Asynchrone Logoanfragen werden gegen neuere Auswahlen abgesichert.
- **Asset:** `logo-qr.png` wird vom bestehenden Icon-Generator aus dem kanonischen hellen transparenten Logo abgeleitet; kein externer Dienst.
- **Geprüft:** Produktionsbuild erfolgreich; QR-Decoderprüfung inklusive des tatsächlichen ShareLyze-Assets erfolgreich. Browserseite eingesehen, aber die Auswahl und der Upload wegen aktiver Annotationsoberfläche nicht interaktiv bedient; realer Browser-PNG-Export und Smartphone-Scan bleiben offen.

### QR-Codes: ausgewählten Link neben Titel (9. November 2026)

- **Umgesetzt:** Link-/Kontextanzeige mit Bearbeiten-Aktion steht neben „QR-Codes“ statt in einer eigenen Zeile. Lange Angaben werden bei Platzmangel mit Auslassung gekürzt und bleiben über den Titelhinweis einsehbar; die direkte Bearbeitung bleibt erreichbar.
- **Geprüft:** Produktionsbuild erfolgreich; laufende Browseransicht bei 1019 px: Titel und Link stehen nebeneinander, ohne horizontalen Seitenüberlauf. Schmalere Ansichten und Tastaturbedienung nicht interaktiv geprüft.

### QR-Gestaltung: Fehlerkorrektur und kompakter Abstand (9. November 2026)

- **Umgesetzt:** „Erweiterte Gestaltung“ bietet die Fehlerkorrektur L, M, Q und H; H bleibt die Vorgabe. Auswahl wirkt auf Vorschau, Vorlagen und SVG-/PNG-Export. Bei Logo und einer anderen Stufe als H erscheint eine Empfehlung zum Testen. Die redundante Einstellung für abgerundete Punkte und der bisherige allgemeine Hinweis wurden entfernt.
- **Gestaltung:** Rahmen-Checkbox steht links neben ihrer Beschriftung. Abstand unter dem Toggle und oberer Innenabstand der Einstellungsfläche reduziert; erzwungene Mindesthöhe entfernt.
- **Geprüft:** Produktionsbuild und QR-Decoderprüfungen erfolgreich, einschließlich aller vier Fehlerkorrekturstufen. Laufende Browseransicht: Checkbox als Flexzeile links und vertikal zentriert, oberer Innenabstand 0 px, Vorgabe H und Vorschau vorhanden. Keine interaktive Prüfung aller Auswahl-/Exportvarianten oder physischer Scans.

- **QR-Export:** Den Hinweis zu Drucktest und Linkgültigkeit auf Nutzerwunsch aus der Oberfläche entfernt.


### QR-Code: JPG-Export und erweiterte Logoformate (9. November 2026)

- **Umgesetzt:** Export als JPG zusätzlich zu PNG/SVG, gleiche wählbare Breite und lokal im Browser gerendertes Ergebnis; JPEG-Qualität 95 %. In der Schaltfläche „Logo wählen“ erscheint nur das Größenlimit, ein Info-Hinweis nennt die Formate PNG, JPEG, WebP, HEIC/HEIF, JPEG XL (JXL) und SVG. Nutzer bestätigte JPEG XL als gemeintes Format.
- **Logoimport:** HEIC/HEIF und JPEG XL werden bei Bedarf lokal im Browser dekodiert und in das bestehende 256-px-PNG überführt; kein Serverupload. Die Decoder werden getrennt erst bei Nutzung geladen. SVG wird vor lokalem Rastern geprüft; aktive Elemente, externe Verweise, XML-Deklarationen außer einfachem XML-Header, Doctype/Entities und CSS-Escapes werden abgelehnt. Somit sind nicht alle beliebigen SVG-Dateien akzeptiert, insbesondere keine Style-Elemente oder eingebetteten Bilder. Eingaben bleiben auf 2 MiB, die Bilddimensionen nach dem Dekodieren auf 4096 × 4096 begrenzt; der jeweilige Decoder kann beim Einlesen größere Zwischenressourcen benötigen. Fehler erhalten eine sichtbare Meldung; bisheriges Logo bleibt erhalten.
- **Lizenzen:** `heic-to` 1.6.7 (LGPL-3.0-or-later, mit libheif/libde265) und `@jsquash/jxl` 1.3.0 (Apache-2.0, mit libjxl BSD-3-Clause); Hinweise, Lizenztexte und Quelllinks unter `frontend/public/licenses/qr-codecs/`, im Build unter `/licenses/qr-codecs/` ausgeliefert. `happy-dom` ausschließlich für Tests.
- **Geprüft:** Produktionsbuild und lokale Suite (67 bestanden, sechs Linux-Tests übersprungen) sowie Produktions-Dependency-Audit ohne bekannte Lücken. Browserprüfung in separatem Tab: lokale HEIC-, JXL- und SVG-Dateien ausgewählt und als PNG-Logo angezeigt; SVG mit externem Bild abgewiesen und vorheriges Logo beibehalten. JPG im Browser tatsächlich heruntergeladen, als JPEG 2048 × 2048 erkannt und per jsQR mit erwartetem `utm_medium=qr` dekodiert. Automatisierte Tests prüfen SVG mit interner Maske, Ablehnung aktiver/externer Inhalte und Größen-/Formatgrenzen. Testtab geschlossen. Keine physische Scan-/Druckprüfung und kein breiter Browser-/Formatkompatibilitätsnachweis; HEIC-/JXL-Decodierung erfordert ausreichend Browserressourcen und bei JXL WebAssembly.

- **QR-Kontext:** Den markierten Hinweis unter den Kontextfeldern auf Nutzerwunsch entfernt; die Erläuterung im Info-Tooltip bleibt verfügbar.

### QR-Fehlerkorrektur: Erläuterung (9. November 2026)

- **Umgesetzt:** Info-Tooltip neben der Stufenauswahl nennt die ungefähre Wiederherstellungsrate bezogen auf Codewörter: L 7 %, M 15 %, Q 25 %, H 30 %. Er erklärt, dass dies keine garantierte beschädigbare Fläche ist, Erkennungsmuster lesbar bleiben müssen und höhere Stufen den Code verdichten können. Quelle: DENSO WAVE, https://www.qrcode.com/en/about/error_correction.html.
- **Geprüft:** Produktionsbuild erfolgreich. In separatem Browsertab den Bereich geöffnet, Tooltip per Hover und Klick angezeigt und per Escape geschlossen; Inhalt und Vorgabe H überprüft. Tab geschlossen. Keine vollständige Screenreaderprüfung.

### QR-Link: Kopieren im gemeinsamen Rahmen (9. November 2026)

- **Umgesetzt:** QR-Link und Kopier-Icon stehen in einem gemeinsamen, auch bei langen URLs umbruchfähigen Rahmen. Das Lucide-Kopiersymbol animiert beim Hover und Tastaturfokus wie die bestehenden Aktionen; bei reduzierter Bewegung entfällt die Animation. Die Überschrift „Vorschau“ wurde entfernt.
- **Geprüft:** Produktionsbuild erfolgreich. In separatem Browsertab bei 1280 und 390 px umschließt der Rahmen Link und Kopierschaltfläche ohne Seitenüberlauf; Hover-Animation beobachtet. Der Kopiervorgang selbst wurde nicht erneut ausgelöst. Testtab geschlossen.

### QR-Export: SVG-Größe im bestehenden Feld (9. November 2026)

- **Umgesetzt:** Das Breiten-Dropdown bleibt bei SVG sichtbar, ist deaktiviert und zeigt „Beliebig skalierbar“. Für PNG/JPG bleibt die zuletzt gewählte Pixelbreite beim Formatwechsel erhalten.
- **Geprüft:** Produktionsbuild erfolgreich. Im separaten Browsertab 4096 px gewählt, zu SVG gewechselt und deaktiviertes Feld samt Text geprüft; nach Wechsel zu JPG waren 4096 px wieder aktiv. Testtab geschlossen.


### QR-Codes: bestehende und eigene Links (9. November 2026)

- **Umgesetzt:** Erster Schritt kurz „Link“. Toggle zwischen vorhandenem Kurzlink/Freigabelink und eigener externer HTTP(S)-Adresse; auch bei leerer Kurzlinkliste verfügbar. Direkte URLs werden ohne Ergänzung von UTM-Parametern kodiert, einschließlich vorhandener Query und Fragment. Für Direktlinks erfasst ShareLyze keine eigenen Aufrufstatistiken; der Kontextbereich steht für ShareLyze-Links zur Verfügung. Benutzername/Passwort in URLs und andere Protokolle werden zurückgewiesen.
- **Kurzlink optional:** Bei gültiger eigener Adresse bietet „Kurzlink erstellen“ explizit die Anlage über die bestehende authentifizierte API an; kein automatischer POST. Der generierte Slug verwendet bestehende Servervorgaben. Nach Erfolg wird der neue Kurzlink unmittelbar in die App-Liste übernommen und ausgewählt; `utm_medium=qr` und optionale Kontextwerte gelten für den ShareLyze-Link. Eingabe und erneute Erstellung sind während der Anfrage gesperrt, Fehler bleiben sichtbar. Auch ein zu langer direkt nicht erzeugbarer QR-Code kann verkürzt werden.
- **Geprüft:** Produktionsbuild und lokale Suite 71 bestanden / sechs plattformabhängig übersprungen. React-Tests mit leerer Liste prüfen direkte URL samt Query/Fragment, keine Anlage ohne Klick, Übernahme des neu angelegten Kurzlinks, ungültiges Protokoll und lange URL. Isolierter In-Memory-HTTP-Test: authentifizierte Anlage, Weiterleitung zum unveränderten Ziel und Erfassung von `utm_medium=qr`. Browser: eigene Testadresse eingegeben, direkte Vorschau und aktivierte Erstellaktion geprüft; schmale Ansicht bei 390 px ohne Seitenüberlauf geprüft. Kein realer Kurzlink in den Nutzerdaten angelegt; Browser-Erstellen mit echtem Backend, physischer Scan und Screenreaderprüfung bleiben offen.

- Statistikansicht: kumulierter Graph mit kompaktem Hover-Tooltip; automatische Aktualisierung sichtbarer Ansichten alle 30 Sekunden und beim Zurückkehren zum Tab. Browserprüfung noch offen.

- Graphlegende gruppiert Ansichten, Kurzlink-Weiterleitungen und Downloads; Datei- und ZIP-Ereignisse werden für Starts, Abbrüche und serverseitige Abschlüsse zusammengezählt. Fehler bleiben von Abbrüchen getrennt; Ereignisse zählen Übertragungsversuche einschließlich Range-Anfragen. Browserprüfung offen.

- Die Graphlegende steht neben der Überschrift „Kumuliert“ und bricht bei Platzmangel um.

- Graph-Tooltip und Legende verwenden die kurze Beschriftung „Downloads erfolgreich“ für serverseitig abgeschlossene Übertragungen.

- Kampagnenfilter sind unter „Weitere Filter“ integriert; aktive Kampagnenfilter werden dort angezeigt. Die markierten Hinweistexte wurden entfernt. Browserprüfung steht aus.

- Statistik: Kennzahlenblock unter dem Graphen und Erklärungstext unter dem Kalender entfernt.

- Statistikoberfläche: Ereignislog, Kampagnengenerator und weitere Auswertungen einschließlich Heatmap vorerst entfernt; Graph und Kalender bleiben. Kalenderauswahl öffnet den Stundenverlauf. Erfassung, Datenbank und Analytics-API wurden nicht verändert; bestehende Aufbewahrungsregeln gelten weiterhin. Spätere Darstellung der gespeicherten Daten offen. Browserprüfung steht aus.

- Verbliebene Statistik-Hinweistexte und DB-IP-Attribution auf der Statistikseite entfernt; die Attribution bleibt in den GeoIP-Einstellungen sichtbar. Datenerfassung unverändert.

- Filter-Toggles für Kurzlinks und Freigaben behalten beim Wechsel ihre ursprüngliche Reihenfolge; das animierte Ein- und Ausklappen sowie reduzierte Bewegung bleiben erhalten. Browserprüfung der Animation steht aus.

- Freigabenverwaltung zusammengeführt: Gemeinsame Liste und Suche/Statusfilter für Datenfreigaben und Kurzlinks; bestehende Aktionen und Bearbeitung bleiben je Typ. Erstellung über „Lokal“, „Hochladen“ oder „Kurzlink“ oberhalb der jeweiligen Felder. Alte Route `#kurzlinks` öffnet die Freigabenansicht. Build und lokale Suite erfolgreich (72 bestanden, 6 übersprungen); interaktive Browser-, Mobil- und Bedienprüfung steht aus.

- Gemeinsame Freigabenliste: Symbole kennzeichnen Einzeldatei, Ordner, mehrere Elemente und Kurzlink. Der geschützte Listenendpunkt liefert dafür nur die Inhaltsart; Browserprüfung offen.

- Freigabeerstellung: „Kurzlink“ steht links und ist standardmäßig ausgewählt; „Lokal“ heißt jetzt „Lokal freigeben“. Browserprüfung offen.

- Lokale Freigabeauswahl: Dezenter Trenner und Abstand zwischen Formular und Quellen-/Ordnerauswahl ergänzt; Browserprüfung offen.

- Statusfilter der Freigaben darf auf schmalen Bildschirmen in der Kopfzeile umbrechen und bleibt bei Bedarf horizontal scrollbar; der Inhaltsrand begrenzt seine Breite. Browserprüfung der Animation und schmaler Ansichten offen.

- Freigabenliste: QR-Aktion öffnet die QR-Werkbank mit dem jeweiligen Kurzlink bzw. der jeweiligen Freigabe; vorhandene Gestaltung bleibt erhalten. Browserprüfung offen.

- QR-Export: Breitenwahl neben dem Format-Toggle, bei sehr wenig Platz umgebrochen. Browserprüfung offen.

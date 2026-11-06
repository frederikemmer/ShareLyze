# QR-Codes für Kurzlinks – Konzepte

Stand: 6. November 2026. Angefragter eigener QR-Bereich, konzeptionell ausgearbeitet. Ausgewählt und lokal produktiv implementiert ist die geführte Werkbank der zweiten Runde (`05-gefuehrte-werkbank.png`). Drei Schritte als bestehendes ShareLyze-Toggle; Standard schwarz auf weiß. Die folgenden Konzeptbeschreibungen dokumentieren die vorausgehende Auswahl. Funktionsnachweise und offene Browserabnahme stehen im Projektplan und in `design-qa.md`.

## Gemeinsamer Rahmen

Neuer Header-Menüpunkt „QR-Codes“ mit Lucide `QrCode` zwischen Kurzlinks und Statistiken. Bestehenden Header, Icon-Navigation, ShareLyze-Logo und kompakte Gestaltung beibehalten. Auf Mobilgeräten als beschrifteter Eintrag im bestehenden Menü vorsehen. Die Bildentwürfe sind illustrative Desktopansichten, keine Browseraufnahmen.

QR-Codes entstehen aus bestehenden Kurzlinks. Vorschläge für optionale Kampagneninfos: Name/Anlass, Quelle, Medium und gegebenenfalls Variante. Einfache private Anlässe wie Fotobuch, Einladung oder Aushang sind ebenso passend wie Kampagnen. Gestaltungsvorschläge: Farben, Modul-/Augenform, Logo, Rahmen und Beschriftung; Export als PNG oder SVG. Diese Funktionen sind vorgeschlagen, noch nicht umgesetzt oder vollständig spezifiziert.

## Richtungen

- **QR-Werkbank:** Kurzes Formular links, unmittelbare Vorschau rechts. Kurzlink wählen, optionale Kampagne erfassen, Vorlage anpassen, speichern/exportieren. Gut für gelegentliches schnelles Erstellen; Mobilansicht müsste Formular und Vorschau stapeln.
- **Kampagnen-Sammlung:** Flache Liste nach Anlass mit kleinen QR-Vorschauen; Auswahl öffnet einen Detailbereich mit Gestaltung und Export. Gut für wiederverwendbare Varianten desselben Kurzlinks; zusätzliche Erstellansicht wäre auszuarbeiten.
- **Design-Atelier:** Große Druckvorschau, kompakte lokale Gestaltungswerkzeuge und Vorlagenleiste; Kampagneninfos nachrangig aufklappbar. Gut für bewusst gestaltete Einladungen/Fotobücher; mobile Werkzeugführung noch offen.

## Fachliche Entscheidungen vor Implementierung

- **Früherer Vorschlag der ersten Runde, nicht beschlossen:** Jede auswertbare QR-Variante erhält eine eigene öffentliche Kurzadresse, die auf den bestehenden Kurzlink verweist. Dadurch muss der QR-Code keine lange Ziel-URL oder umfangreiche Kampagnenparameter enthalten. Namensvergabe, Datenmodell, Reservierungen und Lebenszyklus sind offen. Bestehende Sperren, Passwort-/Ablaufprüfungen und Ereignissemantik dürfen über diesen Einstieg nicht umgangen werden.
- **Messung:** Ein Aufruf einer QR-Variantenadresse ist kein belegter Kamerascan. Manuelles Öffnen, Vorschauen und Bots sind möglich. „Aufrufe über QR-Link“ wäre eine passende Bezeichnung; keine eindeutigen Personen oder garantierten Scans behaupten. Aktueller Stand: Die Telemetrie übernimmt inzwischen die explizit erlaubten UTM-Kampagnenfelder, keine beliebigen Querys. Die zweite Entwurfsrunde baut auf dieser vorhandenen Zuordnung auf. Separate QR-Adressen bleiben eine unbeschlossene Alternative; keine neue Erfassung aus den Bildern ableiten.
- **UTM-Stand aktualisiert:** Der vorhandene Statistikgenerator verwendet Quelle, Medium, Kampagne und Variante als öffentliche URL-Parameter und erzeugt lokal PNGs (`qrcode`, MIT). Die Allowlist umfasst zusätzlich `utm_term`; Weitergabe über Freigabe-/Passwortnavigation ist dokumentiert, konfigurierte externe Zieladressen bleiben unverändert. Die neuen Entwürfe nutzen diese Basis. Interne Organisation, persistente Gestaltung und mögliche spätere UTM-Weitergabe an externe Ziele sind gesondert zu spezifizieren. Siehe `docs/ANALYTICS.md`.
- **Darstellung:** Ausreichende Ruhezone, Kontrast, Fehlerkorrektur und begrenzte Logoüberdeckung berücksichtigen. Keine freie Verzerrung. Tatsächlich erzeugte Exporte mit Decoder und realen Geräten prüfen; die Muster der generierten Bilder sind nicht als scannbare Codes zugesichert.
- **Beständigkeit:** Gedruckte Codes referenzieren ihre gespeicherte Adresse. Änderungen am Ziel, Löschen/Deaktivieren der QR-Variante und des Basislinks sowie Kampagnenbearbeitung brauchen klare Regeln.
- **Datenschutz/Technik:** Generierung lokal in ShareLyze vorsehen, ohne externen QR-Dienst. Bibliotheks- und Exportlizenz sowie sichere Verarbeitung von Logos und SVG-Ausgaben vor Umsetzung prüfen.

## Nachweise und offene Punkte

Die Bildentwürfe dienen ausschließlich der Auswahl von Struktur und Bedienung. Für diese Entwürfe keine API-Anbindung oder funktionierende Umsetzung des eigenen Designbereichs und keine Scan-, Browser-, Mobil-, Barrierefreiheits-, Sicherheits- oder NAS-Prüfung. Der parallel vorhandene einfache Statistikgenerator ist davon getrennt. Durch die Konzeptarbeit keine produktiven Dateien geändert. Nach Auswahl sind Interaktionen, Speicherung, Export und die oben genannten Entscheidungen auszuarbeiten.

## Bilddateien in angezeigter Reihenfolge

1. `01-qr-werkbank.png`
2. `02-kampagnen-sammlung.png`
3. `03-design-atelier.png`

In der Sammlung wiederholt die Illustration dieselbe Adresse für zwei Zeilen; getrennt auswertbare Varianten benötigen tatsächlich verschiedene Kennungen. Das Bild ist keine Festlegung dieser Semantik.

## Vertiefung der QR-Werkbank

Der Nutzer bevorzugt die erste Variante und wünscht weitere unterschiedliche Entwürfe in dieser Richtung. Bestätigt ist damit die Richtung Formular links / Vorschau rechts mit bestehendem Header; kein Implementierungsauftrag.

- **Kompakte Werkbank:** Einstellungszeilen für Farben, Formen, Augen, Logo und Beschriftung; Kampagne zusammengefasst, Exportgröße direkt an der Vorschau. Für schnelle, direkte Bearbeitung.
- **Geführte Werkbank:** Drei Schritte Link/Kampagne, Gestaltung und Export; Vorschau bleibt sichtbar. Zeigt nur die Einstellungen des aktiven Schritts und reduziert gleichzeitige Formularfülle, benötigt mehr Wechsel.
- **Vorlagen-Werkbank:** Lokale Tabs für Vorlagen, Anpassen und Kampagne. Sechs deutlich verschiedene Druckvorlagen, darunter Akzentfarbe und Beschriftung. Schneller visueller Einstieg, individuelle Feinheiten in einem eigenen Tab.

Die zweite Runde zeigt die bestehende Kurzadresse mit UTM-Kennzeichnung statt einer vorausgesetzten neuen QR-Adresse. Die Bilder sind illustrative Zustände, keine Interaktions- oder Exportnachweise. Detaillierte Scanprüfung und vollständige mobile Anordnung bleiben offen.

Bilddateien der zweiten Runde in angezeigter Reihenfolge:

1. `04-kompakte-werkbank.png`
2. `05-gefuehrte-werkbank.png`
3. `06-vorlagen-werkbank.png`

Visuelle Einschränkung: Die Vorlagenansicht markiert eine türkise Akzentfarbe, während der Vorschau-Rahmen sandfarben bleibt; im umgesetzten Editor müssten Auswahl und betroffene Farbe eindeutig zusammenpassen. Die generierten QR-Muster und Logoüberdeckungen sind ausschließlich illustrativ.

## Umsetzung der gewählten geführten Werkbank

Eigener Header-/Mobilmenüpunkt „QR-Codes“, Link-/Kampagnenauswahl, frei wechselbares Drei-Schritte-Toggle und dauerhafte Vorschau. Vorhandene Kurzlinks und Freigaben, konfigurierte öffentliche Linkadresse und bestehende UTM-Semantik. Gestaltung: eckig/rund, Vorder-/Hintergrund mit Kontrastprüfung, optional lokal normalisiertes Rasterlogo, Beschriftung und Rahmen. Lokaler SVG-/PNG-Export, vier PNG-Breiten. Standardfarbe auf Nutzerwunsch `#000000`. QR-Matrix aus vorhandenem `qrcode` (MIT); jsQR (Apache-2.0) ausschließlich als Entwicklungsabhängigkeit für Decoderprüfungen.

Entwurf bleibt während der angemeldeten Sitzung im gemounteten Bereich erhalten, auch beim Seiten-/Schrittwechsel; keine Datenbank-/Neuladepersistenz und keine neue QR-Adresse. Kein Upload zum Server. Logo nur PNG/JPEG/WebP bis 2 MiB und 4096 × 4096 Pixel, normalisiert auf eingebettetes PNG; kein aktives SVG-Logo. Vier Module Ruhezone; Rahmen erhält zusätzlichen Abstand, QR-Modulrundung verändert die Erkennungsmuster nicht. Logo max. 12 % Symbolbreite plus begrenzte Hintergrundfläche, Fehlerkorrektur H. Tatsächliche Scanbarkeit ist weiterhin geräte-/druckabhängig.

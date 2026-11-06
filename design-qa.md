# Design-QA: öffentliche Freigabe

Final result: blocked

Referenz: gewählter Entwurf 2 (generiertes Bild aus der Unterhaltung). Umsetzung: Browseraufnahme der bestehenden Freigabe am 6. November 2026. Der vorhandene Kopfbereich und Pfad wurden auf ausdrücklichen Wunsch beibehalten; Ordner stehen gesondert und die Ansichten werden über ein Menü gewählt.

Die Kachelansicht und das Umschalten zur Liste wurden an vorhandenen Bildern sichtbar geprüft. Eine belastbare Gegenüberstellung im gleichen Zustand ist nicht möglich: Die konkrete Freigabe enthält andere Bilder und im geprüften Ordner keine Unterordner. Die mobile Darstellung, Unterordnernavigation und Downloads wurden noch nicht interaktiv geprüft. Die Kacheln verwenden ein gleichmäßiges Raster statt der variablen Bildbreiten des Entwurfs; dies ist als offene Abweichung zu prüfen.


## QR-Werkbank (6. November 2026)

- Visuelles Ziel: `docs/design/qr-code-concepts/05-gefuehrte-werkbank.png`, 1487 × 1058 Bildpixel; vorgesehener Desktop-Zielraum 1440 × 1024 CSS-Pixel. Die abweichende Bildgröße ist keine gemessene Browserdichte.
- Bewusste Nutzerabweichungen: Bestehendes ShareLyze-Toggle statt Schrittanzeige; Standardfarbe reines Schwarz `#000000`.
- Umsetzung: `frontend/src/QrCodes.tsx` im produktiven Headerbereich `#qrcodes`, responsive zweispaltig/einspaltig.
- Browseraufnahme und volle/fokussierte Gegenüberstellung: nicht verfügbar. Der Versuch, den In-App-Browser zu öffnen, liefert „The browser access host is unavailable“. Keine alternative Browserprüfung als erfolgt ausgegeben. Kein Dichteabgleich möglich.
- Funktionsnachweise: Happy-DOM mit echter React-Komponente für Kampagnenfeld, frei anwählbare Toggle-Schritte, Beibehalten der Eingaben, SVG-Download und Gleichheit von Vorschau/Export, Kontrastfehler und Leerzustand. Dies prüft keine visuellen Layouts oder native Downloads.
- QR-Nachweis: SVGs via sharp gerastert, mit jsQR dekodiert: 24 Kombinationen aus Kurz-/Kampagnenadressen, eckigen/runden Modulen, Logo/Rahmen/Beschriftung, 512/1024 px. Vollständige URL stimmt überein. Kein physischer Scan-/Drucknachweis.
- Offen: Desktop-/Mobil-/Hell-/Dunkelansichten, Fokus/Tastatur/Screenreader im echten Browser, Logoauswahl und Canvas-PNG-/Dateidownload im Browser; PNG-Codepfad gebaut, aber Browserexport nicht ausgeführt.
- Vergleichshistorie: Noch kein visueller Implementierungsvergleich möglich; deshalb keine visuell bestätigten Findings oder bestandene Designabnahme.

final result: blocked

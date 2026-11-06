# Kurzlinks: optionale Gültigkeit und Passwort

Stand: 6. November 2026. Drei visuelle Vorschläge, keine Implementierung oder beschlossene Auswahl.

## Gemeinsame Grundlage

Die bestehende kompakte Zeile mit Zieladresse, optionalem Kurznamen, „Erstellen“ und X bleibt Grundlage. Optionen werden erst per Klick, Tastatur oder Touch geöffnet. Vorgabe: unbegrenzt gültig, ohne Passwort. Auftauchen nur durch Einblenden, keine Bewegung oder Skalierung; reduzierte Bewegung berücksichtigen. Die generierten Bilder zeigen dieselbe jeweilige Variante geschlossen und geöffnet mit illustrativen Werten, keine laufenden Browseransichten.

## Varianten in der angezeigten Reihenfolge

1. **Optionen direkt darunter** (`01-inline-options.png`): Ein „Optionen“-Schalter blendet eine zweite Formularzeile mit Gültigkeit und Passwortschutz ein. Einfache räumliche Zuordnung; auf schmalen Seiten können Zusatzfelder untereinander stehen. Benötigt im geöffneten Zustand mehr Höhe. Empfehlung für das bestehende kompakte Formular.
2. **Kleines Options-Popover** (`02-options-popover.png`): Ein Schalter vor „Erstellen“ öffnet ein verankertes kleines Panel. Formularhöhe bleibt konstant; die Optionen können andere Inhalte überdecken. Positionierung, Escape/Zurück zum Auslöser und Verhalten auf kleinen Displays müssen bei Umsetzung berücksichtigt werden.
3. **Seitliches Einstellungsfeld** (`03-options-panel.png`): Optionen öffnen einen getrennten seitlichen Bereich, auf Smartphones ein kompaktes Sheet. Mehr Platz und gut erweiterbar, für nur zwei Optionen jedoch mehr Interaktion und stärkere Trennung vom Formular.

Alle Änderungen gelten unmittelbar für den Entwurf; „Erstellen“ bleibt der einzige Hauptabschluss. Ein Zusammenklappen verwirft konfigurierte Werte nicht. Nach dem Schließen sollten gesetzte Optionen dezent am Auslöser erkennbar sein. Inline-Feldbeschriftungen bleiben bei einer Umsetzung an der bestehenden Produktgestaltung ausgerichtet; Abweichungen in den generierten Bildern sind keine verbindlichen Änderungen.

## Technischer Umfang einer späteren Umsetzung

Aktuell nehmen externe Kurzlinks nur URL/Kurzname/Status entgegen; Ablauf und Passwort sind dort noch nicht implementiert. Dafür sind Datenmodell, Anlegen/Bearbeiten, öffentliche Weiterleitung einschließlich beider Einstiegspfade sowie Passwortprüfung und Rate-Limit zu ergänzen. Passwortschutz betrifft den ShareLyze-Kurzlink und schützt nicht die externe Zielseite, sobald deren Adresse bekannt ist. Dateifreigaben haben bereits eigene Ablauf-/Passwortfunktionen. Vor Umsetzung Details mit diesen Mustern abgleichen. Keine Backend-, Browser-, Responsive- oder Sicherheitsprüfung durch diese Entwürfe nachgewiesen.

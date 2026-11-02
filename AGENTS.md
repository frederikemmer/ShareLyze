# ShareLyze: Hinweise für Entwicklungsagents

ShareLyze ist eine eigenständige, selbst gehostete Anwendung zum Freigeben bestehender Dateien und Ordner sowie zum Verwalten von Kurzlinks. Lies vor konzeptionellen oder implementierenden Änderungen [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md); dort stehen der vereinbarte MVP, technische Leitplanken, offene Entscheidungen und Abnahmekriterien.

## Verbindliche Leitplanken

- ShareLyze wird eigenständig in TypeScript implementiert und unter AGPL-3.0 veröffentlicht. SelfDrop dient ausschließlich als Beispiel und fachliche Referenz: keinen SelfDrop-Code, keine Styles, Assets oder sonstigen Projektbestandteile übernehmen. Ein GitHub-Fork ist nicht die geplante Grundlage.
- Das Design orientiert sich an MediaLyze unter `/Users/frederikemmer/CODE/MediaLyze`, sofern lokal verfügbar. Bestehende MediaLyze-Bausteine dürfen gezielt übernommen und angepasst werden; Herkunft, Urheber- und Lizenzhinweise sowie Drittanbieter-Lizenzen beachten. Keine lokalen absoluten Pfade als Laufzeitabhängigkeit einführen.
- Dateien auf Speicherquellen bleiben unverändert; lesende Docker-Bind-Mounts sind der erste Speicher-Backend-Typ. Keine vollständigen temporären Kopien oder ZIP-Archive für Downloads voraussetzen.
- Ordnerfreigaben zeigen dynamisch den aktuellen Inhalt. Ein ZIP-Download erhält beim Start eine feste Dateiliste und wird gestreamt; er ist im MVP nicht fortsetzbar. Einzeldateien unterstützen fortsetzbare Downloads mit HTTP Range.
- Sicherheit, Zugriffsschutz und Datenschutz gehören zum MVP. Downloadlimits gehören ausdrücklich nicht zum Funktionsumfang.
- Die CI orientiert sich am MediaLyze-Docker- und Release-Workflow, wird aber für ShareLyze und dessen TypeScript-Stack angepasst.
- Vorhandene Nutzeränderungen schützen. Keine Implementierung oder Veröffentlichung allein aus diesem Dokument ableiten; den jeweiligen Arbeitsauftrag beachten.

## Dokumentation pflegen

Halte [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) bei der Arbeit am Projekt aktuell, damit andere Agents auf demselben Stand weiterarbeiten können:

- Trage ein, was umgesetzt und überprüft wurde und welche Arbeiten oder Prüfungen noch offen sind. Unterscheide dabei zwischen geplant, teilweise umgesetzt und abgeschlossen.
- Dokumentiere aufgetretene Probleme, relevante Einschränkungen, neue Erkenntnisse und wichtige Architekturentscheidungen mit ausreichend Kontext für die Fortsetzung.
- Aktualisiere den Plan bei Neuerungen oder vereinbarten Scope-Änderungen. Kennzeichne offene Entscheidungen und stelle klar, was bereits entschieden und was lediglich vorgeschlagen ist.
- Pflege den aktuellen Stand nachvollziehbar und kompakt; bewahre weiterhin relevante Entscheidungen und entferne oder korrigiere überholte Angaben, statt widersprüchliche Aussagen stehen zu lassen.

Behaupte keine erfolgreiche Sicherheits-, Browser-, Last- oder NAS-Prüfung ohne entsprechende Nachweise.

Marathon • Calisthenics Web-App v2

ENTHALTEN
- 16-Wochen-Marathonplan bis 28.12.2026
- 2 Krafttage + 3 Lauftage, Do/Fr Pause
- Satz-/Wiederholungs-/Gewichts-/RIR-Logging
- automatische Progressions-Empfehlung
- Lauf-Logging mit Pace, HF, RPE
- 5k/10k -> Marathon-Projektion (Riegel)
- Marathon-Ziel-Score für 4:00 h
- Kalorien-/Protein-Rechner + Gewichtstrend
- Datenexport / Import
- ICS-Kalenderexport
- Garmin-Export als strukturierte JSON-Daten
- PWA/Offline-Cache

GARMIN
Die echte automatische Garmin-Connect-Synchronisation kann nicht sicher als reine GitHub-Pages-Frontend-App umgesetzt werden.
Garmin stellt dafür das Garmin Connect Developer Program und die Training API bereit. Laut Garmin ist das Programm für Business-/Enterprise-Nutzung vorgesehen und muss beantragt/approved werden.
Der Ordner garmin-integration enthält eine Beispielarchitektur für ein späteres Backend mit OAuth 2.0. Keine Secrets in die statische App legen.

INSTALLATION
1. Dateien auf GitHub Pages hochladen.
2. manifest.webmanifest und sw.js im gleichen Ordner wie index.html lassen.
3. Seite öffnen und zum Home-Bildschirm hinzufügen.

HINWEIS
Der Ziel-Score ist eine Trainingshilfe, keine medizinische oder sportwissenschaftliche Garantie. Die Aussage wird besser, sobald echte 5-km-/10-km-Testzeiten und regelmäßige Laufdaten vorliegen.

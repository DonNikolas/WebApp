Marathon • Calisthenics v3
===========================

DEPLOYMENT (GitHub Pages)
--------------------------
Lade diese 4 Dateien in dein bestehendes GitHub-Repository hoch (vorhandene Dateien überschreiben):

- index.html
- app.js         (NEU in v3 — unbedingt mit hochladen, sonst startet die App nicht)
- manifest.webmanifest
- sw.js

Commit changes. GitHub Pages aktualisiert automatisch. Danach die Seite auf dem
Handy einmal neu laden (der Service Worker löscht alte Caches selbstständig).

DEINE DATEN
-----------
Deine V2-Daten (Läufe, Kraft-Sets, Gewicht, Score-Verlauf) werden beim ersten
Öffnen von v3 automatisch übernommen (localStorage-Migration von "mc_v2" nach
"mc_v3"). Die alte "mc_v2"-Kopie bleibt unangetastet im Browser erhalten.

Hinweis: Die Wochenstruktur hat sich geändert (Mo/Mi/Sa = Kraft A/B/C,
Di/Do/So = Laufen, Fr = Pause). Alte "erledigt"-Markierungen an Tagen, die in
der neuen Struktur einen anderen Trainingstyp haben (z. B. alter Samstagslauf),
bleiben als Häkchen bestehen, beziehen sich aber jetzt auf den neuen Plan-Eintrag
an diesem Datum.

WAS NEU IST IN V3
------------------
- Neues, sauber getrenntes Datenmodell (Profile, Runs, Strength Sets, Weights,
  Readiness-Verlauf, Prognose-Verlauf) statt einer Datenmischung
- Marathon Readiness Score (0-100) MIT transparenten Gruenden (positiv/negativ)
- Getrennte Prognosen: theoretisch (Riegel-Formel) vs. trainingsbasierte Spanne
  vs. grobe Zielwahrscheinlichkeit - klar als Schaetzung gekennzeichnet
- Automatische Erkennung von Bestzeiten (5 km/10 km/Halbmarathon) aus echten
  geloggten Laeufen statt manueller Dateneingabe (optional ueberschreibbar)
- Trainingsbelastung (Akut:Chronisch-Verhaeltnis) + automatische Ermuedungs-
  warnungen (zu schneller Kilometeranstieg, sinkende Pull-up-Leistung, etc.)
- Aerobe-Effizienz-Vergleich fuer Easy Runs (Pace vs. Herzfrequenz)
- Automatischer Wochenbericht mit Fazit und Empfehlung
- Dynamische Kalorienschaetzung, die sich an deiner echten Gewichtsentwicklung
  anpasst
- Deutlich mehr Charts (Progress-Tab): Prognose-Verlauf, Readiness-Verlauf,
  geplante vs. absolvierte Kilometer, Long-Run-Entwicklung, Pace, Herzfrequenz,
  Gewicht, Kraft-Progression, Trainingsbelastung
- CSV-Export fuer Laeufe und Kraft-Sets, zusaetzlich zu JSON-Export/Import und
  Kalender-Export (.ics)
- Klare Kennzeichnung, woher jede Zahl kommt: gemessen / manuell / Schaetzung /
  Prognose

WAS BEWUSST EINFACH GEHALTEN WURDE
------------------------------------
- Garmin-Synchronisation ist weiterhin nur architektonisch vorbereitet
  (Backend + OAuth noetig) - es gibt keine funktionierende automatische
  Uebertragung, um keine Fake-Integration vorzutaeuschen.
- Alle Belastungs-/Prognose-Kennzahlen sind ausdruecklich grobe, transparent
  erklaerte Schaetzungen, keine wissenschaftlich exakten Werte.
- Datenspeicherung erfolgt in localStorage (kein Server, keine Cloud) -
  robust und einfach, aber geraetegebunden. Nutze den JSON-Export, um Daten
  zu sichern oder auf ein anderes Geraet zu uebertragen.

#!/bin/bash
cd /private/tmp/claude-501/-Users-diegoguerrero-Desktop-designApp/c3b5464f-5b4b-4820-a521-b2e3109f704d/scratchpad/pagetest
for b in brisa vectora ollaria; do
  node sheet.mjs $b A "1 · Haiku página=$b-page-desktop.png" "2 · + color=$b-page-color-desktop.png" "3 · + baseline-ui=$b-page-uiskills-desktop.png" "4 · + paquete ui-skills=$b-page-uiskills-all-desktop.png" "5 · + frontend-design=$b-page-frontend-desktop.png"
  node sheet.mjs $b B "6 · + DESIGN.md=$b-page-designmd-desktop.png" "7 · + referencias web=$b-page-refs-desktop.png" "8 · Sonnet página=$b-page-sonnet-desktop.png" "9 · Opus página=$b-page-opus-desktop.png" "10 · agente (prueba 1)=/private/tmp/claude-501/-Users-diegoguerrero-Desktop-designApp/c3b5464f-5b4b-4820-a521-b2e3109f704d/scratchpad/skilltest/$b/desktop.png"
done

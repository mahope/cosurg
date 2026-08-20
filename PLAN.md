# BurnTree — måldrevet plan (torsdag 20/8)

Vi arbejder mod **mål**, ikke opgavelister. Hvert mål har et observerbart færdig-kriterium:
noget man kan se ske. Et mål er ikke nået fordi der er skrevet kode — det er nået når
kriteriet er verificeret.

Claude er orchestrator og holder agenterne kørende. Mads spørges kun ved reelle valg.

## Hårde deadlines

| Tid | Hvad |
|---|---|
| Torsdag ~22:00 | Kode fryses, deploy står |
| **Fredag 11:00** | **Mads går — alt skal være færdigt og gennemspillet** |
| Fredag 14:00 | Code freeze + submission |
| Fredag 14:00–15:30 | Magnus + Rami præsenterer alene |

---

## MÅL 1 — Magnus og Rami kan gennemføre demoen uden Mads
**Færdig når:** de to har kørt hele flowet igennem én gang fredag formiddag uden hjælp,
fra live-mikrofon til færdigt notat, og der findes en fallback-video hvis nettet svigter.
Dette mål vinder over alle andre. En flottere app der ikke kan demonstreres er værdiløs.

## MÅL 2 — Kirurgen kan styre appen uden at røre skærmen
**Færdig når:** et helt procedureforløb er gennemført hands-free i OR-tilstand — stemmen
fører, store billeder viser hvad der skal gøres, og "næste", "gentag", "tilbage" virker
pålideligt uden at baggrundssnak udløser noget.
*Dette er demoens klimaks og vores stærkeste kort på Best UX.*

## MÅL 3 — Anbefalingen er beviseligt klinisk, ikke genereret
**Færdig når:** vi på skærmen kan pege på at anbefalingen kom fra træet, at koderne kom
fra Cortis coding-API (helst danske SKS), og at agenten spørger igen frem for at gætte
når svaret er uklart.
*Det er hele vores præcisions-påstand. Uden den er vi bare endnu en scribe.*

## MÅL 4 — Det ser ud som et klinisk værktøj fra PlastSurgeon-familien
**Færdig når:** appen følger PlastSurgeon-designguiden (Roboto, SurgeonBlue #005355,
"S"-elementet), og klinisk alvor stadig kan aflæses entydigt på farve.

## MÅL 5 — Intet vi siger til dommerne er usandt
**Færdig når:** README og pitch beskriver præcis hvad koden faktisk kalder — hverken
mere eller mindre. Kliniske træer bærer forfatternavne eller er tydeligt mærket UDKAST.

---

## Regel-status (Corti kræver nu 3 af 5 områder)

| Område | Status |
|---|---|
| Ambient STT | ✅ verificeret live |
| Text generation | ✅ journalnotat |
| Agentic framework | ✅ svarfortolkning m. struktureret output |
| Medical coding | 🔄 kobles på Symphony nu (i dag: opfundet af sprogmodel) |
| Dictation STT | ⏸️ nedprioriteret — kun hvis tid |

**Kravet er formelt opfyldt** af de tre første. Coding forfølges for værdiens skyld.

## Agent-spor og filejerskab (undgår konflikter)

| Spor | Ejer filer |
|---|---|
| A — Corti-produktområder | `lib/corti/*`, `app/api/**`, `README.md` |
| B — UX/UI + OR-interaktion | `app/page.tsx`, `components/*`, `app/globals.css`, `lib/i18n.ts`, `app/layout.tsx` |
| C — Performance & demo-sikkerhed | `next.config.ts`, tests, scripts |
| D — Deploy | serveren, compose-stacken |

## Deploy
`burntree.plastsurgeon.com` → 138.199.206.15 (DNS verificeret 20/8).
Serveren kører **Openship**, ikke Dokploy. Deployet ligger i sit eget spor.

## Klinisk indhold — venter på Magnus og Rami
Begge træer er UDKAST og skal godkendes før demoen:
- `content/trees/burns.json` — beslutningstræ, udledt af brandsaar.dk
- `content/trees/dressing-hand-arm.json` — 12 forbindingstrin (pptx'en havde kun fotos)

## Faste beslutninger
- Anbefalingen kommer ALTID fra træet, aldrig fra en sprogmodel.
- TTS: Syv.ai (Plapre) på dansk, browserstemme som fallback. Corti har ikke TTS.
- Alle betalte ruter har origin-lås, per-IP-kvote og længdegrænser.
- SSH mod nsl kører gennem ControlMaster — mange hurtige forbindelser udløser fail2ban.

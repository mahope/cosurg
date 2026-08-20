# CoSurg — goal-driven plan (Thursday 20 Aug)

*(Dansk udgave nedenfor — [spring til den danske udgave](#cosurg--måldrevet-plan-torsdag-208))*

> This is the build-day plan as it was written on Thursday morning, kept as a record
> of what we worked towards. The outcome of each item is stated in **Where it landed**
> below. The root [`README.md`](../README.md) describes the finished system.

We work towards **goals**, not task lists. Every goal has an observable completion
criterion: something you can watch happen. A goal is not reached because code was
written — it is reached when the criterion has been verified.

## Hard deadlines

| Time | What |
|---|---|
| Thursday ~22:00 | Code freeze, deployment standing |
| **Friday 11:00** | **Mads leaves — everything finished and rehearsed** |
| Friday 14:00 | Code freeze + submission |
| Friday 14:00–15:30 | Magnus + Rami present on their own |

---

## GOAL 1 — Magnus and Rami can run the demo without Mads
**Done when:** the two of them have run the whole flow once on Friday morning
unaided, from live microphone to finished note. This goal beats all the others. A
prettier app that cannot be demonstrated is worthless.

## GOAL 2 — The surgeon can drive the app without touching the screen
**Done when:** a whole procedure has been completed hands-free in OR mode — the voice
leads, large images show what to do, and "next", "repeat", "back" work reliably
without background chatter triggering anything.
*This is the climax of the demo and our strongest card for Best UX.*

## GOAL 3 — The recommendation is demonstrably clinical, not generated
**Done when:** we can point at the screen and show that the recommendation came from
the tree, that the codes came from Corti's coding API (Danish SKS if possible), and
that the agent asks again rather than guessing when an answer is unclear.
*This is our entire precision claim. Without it we are just another scribe.*

## GOAL 4 — It looks like a clinical tool from the PlastSurgeon family
**Done when:** the app follows the PlastSurgeon design guide (Roboto, SurgeonBlue
#005355, the "S" element), and clinical severity can still be read unambiguously from
colour alone.

## GOAL 5 — Nothing we tell the judges is untrue
**Done when:** the README and the pitch describe exactly what the code actually calls
— no more and no less. Clinical trees carry named professional sources.

---

## Where it landed

| Corti product area | Outcome |
|---|---|
| Ambient STT | Delivered — `lib/audio/useTranscribe.ts` |
| Dictation STT | Delivered — `lib/audio/useDictation.ts`, wired up in `app/page.tsx` |
| Text generation | Delivered — the clinical note, `app/api/note/route.ts` |
| Agentic framework | Delivered — five agents with structured output, including the clinical lookup agent with our MCP server as a connector |
| Medical coding | Delivered — Corti Symphony, `lib/corti/coding.ts` |

The rules require three of the five areas. All five are in use. The MCP server, listed
as out of scope in `SPEC.md`, was built after all and runs at `mcp.cosurg.com`.

## Agent tracks and file ownership (avoids conflicts)

| Track | Owns files |
|---|---|
| A — Corti product areas | `lib/corti/*`, `app/api/**`, `README.md` |
| B — UX/UI + OR interaction | `app/page.tsx`, `components/*`, `app/globals.css`, `lib/i18n.ts`, `app/layout.tsx` |
| C — Performance & demo safety | `next.config.ts`, tests, scripts |
| D — Deployment | the server, the compose stack |

## Deployment
`cosurg.com` resolves to the project server (DNS verified 20 Aug).
The server runs **Openship**, not Dokploy. Deployment sits in its own track.

## Clinical content
Both trees are named with their professional sources: the Danish Burn Association
(brandsaar.dk) and Rigshospitalet's burn unit, Section 6052.

## Fixed decisions
- The recommendation ALWAYS comes from the tree, never from a language model.
- TTS: Syv.ai (Plapre) in Danish, browser voice as fallback. Corti has no TTS.
- Every paid route has an origin lock, a per-IP quota and length caps.

---
---

# CoSurg — måldrevet plan (torsdag 20/8)

*(Dette er den danske udgave af afsnittene ovenfor. Engelsk er repoets hovedsprog —
[spring til den engelske udgave](#cosurg--goal-driven-plan-thursday-20-aug).)*

> Dette er byggedagens plan som den blev skrevet torsdag morgen, bevaret som
> dokumentation for hvad vi arbejdede mod. Hvor hvert punkt landede, står under
> **Hvor det landede**. [`README.md`](../README.md) beskriver det færdige system.

Vi arbejder mod **mål**, ikke opgavelister. Hvert mål har et observerbart færdig-kriterium:
noget man kan se ske. Et mål er ikke nået fordi der er skrevet kode — det er nået når
kriteriet er verificeret.

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
fra live-mikrofon til færdigt notat.
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
mere eller mindre. Kliniske træer bærer navngivne faglige kilder.

---

## Hvor det landede

| Corti-produktområde | Resultat |
|---|---|
| Ambient STT | Leveret — `lib/audio/useTranscribe.ts` |
| Dictation STT | Leveret — `lib/audio/useDictation.ts`, tilkoblet i `app/page.tsx` |
| Text generation | Leveret — journalnotatet, `app/api/note/route.ts` |
| Agentic framework | Leveret — fem agenter med struktureret output, heriblandt opslagsagenten med vores MCP-server som connector |
| Medical coding | Leveret — Corti Symphony, `lib/corti/coding.ts` |

Reglerne kræver tre af de fem områder. Alle fem er i brug. MCP-serveren, der i
`SPEC.md` stod uden for scope, blev bygget alligevel og kører på `mcp.cosurg.com`.

## Agent-spor og filejerskab (undgår konflikter)

| Spor | Ejer filer |
|---|---|
| A — Corti-produktområder | `lib/corti/*`, `app/api/**`, `README.md` |
| B — UX/UI + OR-interaktion | `app/page.tsx`, `components/*`, `app/globals.css`, `lib/i18n.ts`, `app/layout.tsx` |
| C — Performance & demo-sikkerhed | `next.config.ts`, tests, scripts |
| D — Deploy | serveren, compose-stacken |

## Deploy
`cosurg.com` peger på projektserveren (DNS verificeret 20/8).
Serveren kører **Openship**, ikke Dokploy. Deployet ligger i sit eget spor.

## Klinisk indhold
Begge træer er navngivet med deres faglige kilder: Dansk Brandsårsforening (brandsaar.dk) og
Rigshospitalets brandsårsafdeling, Afsnit 6052.

## Faste beslutninger
- Anbefalingen kommer ALTID fra træet, aldrig fra en sprogmodel.
- TTS: Syv.ai (Plapre) på dansk, browserstemme som fallback. Corti har ikke TTS.
- Alle betalte ruter har origin-lås, per-IP-kvote og længdegrænser.

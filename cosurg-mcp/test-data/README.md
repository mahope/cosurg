# Synthetic test data — fictional patients, not evidence

*(Dansk udgave nedenfor — [spring til den danske udgave](#syntetisk-testdata--opdigtede-patienter-ikke-evidens))*

> **Nothing in this directory is loaded by the MCP server, and nothing from it may
> ever be quoted in a clinical answer.** That is why the directory sits outside
> `data/`.

The organiser's dataset for Corti Hack for Health, downloaded 19 Aug 2026 from the
[Google Drive folder](https://drive.google.com/drive/folders/1k1GgiVBbL3KoXqlMQFCOsg1PVTmei8bW).

## Why it is kept separate

The knowledge base in `../data/kilder/` is written by named plastic surgeons, and
CoSurg's clinical chat quotes it verbatim as the grounds for its answers. The records
here are generated: the patients do not exist and the numbers are invented.

The two kinds of text are indistinguishable in a markdown excerpt. A fictional patient
quoted as a clinical source would look entirely credible — which is exactly why it must
not be able to happen by accident. The separation is physical rather than a label: the
server cannot reach this directory. See `../data/README.md`.

## Contents

| Directory | What |
|---|---|
| `text-samples/` | Six synthetic patient records, one directory per patient (patient, conditions, medications, labs, vitals, encounters and more) |
| `audio-samples/` | 24 English audio files (m4a + wav) for STT testing. Not in git — 77 MB, fetch from the Drive link above. |

The patients: `aisha_rahman` (cancer survivorship), `david_kim` (oncology),
`elena_petrova` (pneumonia), `harold_mitchell` (geriatrics), `jamal_wright`
(diabetic foot ulcer), `jane_smith` (cardiology).

## Why we do not use them in the product

The dataset is primary care and oncology, in English. There are no plastic surgery
cases and no burns — `jamal_wright`'s diabetic foot ulcer is the closest, and a foot
ulcer is not a burn. The demo's clinical content therefore comes from the team's own
sources, and the demo scenarios are recorded by Magnus and Rami. The rules permit both.

`jane_smith/use-cases.md` was 0 bytes on Drive (confirmed via `Content-Length: 0`) and
does not exist for the other patients.

---
---

# Syntetisk testdata — opdigtede patienter, ikke evidens

*(Dette er den danske udgave af afsnittene ovenfor. Engelsk er repoets hovedsprog —
[spring til den engelske udgave](#synthetic-test-data--fictional-patients-not-evidence).)*

> **Intet i denne mappe indlæses af MCP-serveren, og intet herfra må nogensinde
> citeres i et klinisk svar.** Det er derfor mappen ligger uden for `data/`.

Arrangørens datasæt til Corti Hack for Health, hentet 19/8 2026 fra
[Google Drive-mappen](https://drive.google.com/drive/folders/1k1GgiVBbL3KoXqlMQFCOsg1PVTmei8bW).

## Hvorfor det ligger adskilt

Vidensbasen i `../data/kilder/` er skrevet af navngivne plastikkirurger, og
CoSurgs kliniske chat citerer den ordret som grundlag for sine svar. Journalerne
her er derimod genererede: patienterne findes ikke, og tallene er opdigtede.

De to slags tekst ligner hinanden til forveksling i et markdown-uddrag. En
opdigtet patient citeret som klinisk kilde ville se fuldstændig troværdig ud —
og det er præcis derfor det ikke må kunne ske ved et uheld. Adskillelsen er
fysisk frem for en mærkat: serveren kan ikke nå denne mappe. Se
`../data/README.md`.

## Indhold

| Mappe | Hvad |
|---|---|
| `text-samples/` | Seks syntetiske patientjournaler, én mappe pr. patient (patient, conditions, medications, labs, vitals, encounters m.m.) |
| `audio-samples/` | 24 engelske lydfiler (m4a + wav) til STT-test. Ikke i git — 77 MB, hentes fra Drive-linket ovenfor. |

Patienterne: `aisha_rahman` (cancer-survivorship), `david_kim` (onkologi),
`elena_petrova` (pneumoni), `harold_mitchell` (geriatri), `jamal_wright`
(diabetisk fodsår), `jane_smith` (kardiologi).

## Hvorfor vi ikke bruger dem i produktet

Datasættet er almen medicin og onkologi på engelsk. Der er ingen
plastikkirurgiske cases og ingen brandsår — `jamal_wright`s diabetiske fodsår er
det tætteste, og et fodsår er ikke et brandsår. Demoens kliniske indhold kommer
derfor fra holdets egne kilder, og demo-scenarierne er indtalt af Magnus og Rami.
Reglerne tillader begge dele.

`jane_smith/use-cases.md` var 0 bytes på Drive (bekræftet med `Content-Length: 0`)
og findes ikke hos de øvrige patienter.

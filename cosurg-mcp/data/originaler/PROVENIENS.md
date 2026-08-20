# Primærkilder — hvor teksten i vidensbasen kommer fra

*(English below)*

Serveren indlæser ikke denne mappe. Den findes så en påstand i et klinisk svar kan
spores hele vejen tilbage til det dokument den stammer fra. Alt materiale her er
lavet af holdets egne medlemmer eller af navngivne kolleger, og må bruges i demo og
submission (afklaret 20/8 2026).

## Dansk Brandsårsforening — brandsaar.dk

| Fil | Hvad |
|---|---|
| `lommekort-2019.pdf` | Lommekort, 2019-udgaven |
| `lommekort-2022.pdf` | Lommekort, 2022-udgaven |

Sitets 34 sider og begge lommekort er udtrukket til `../kilder/brandsaar-dk.md`.
brandsaar.dk er skrevet af **Rami Mossad Ibrahim**, plastikkirurg og medlem af holdet.

## Rigshospitalets brandsårsafdeling, Afsnit 6052

Via **Magnus Avnstorp**, plastikkirurg og medlem af holdet.

| Fil | Hvad |
|---|---|
| `Burns plast surgeon.docx` | Klinisk oversigt over brandsårsbehandling → `burns-plast-surgeon.md` |
| `Brandsårsforbindinger step by step - final edition .pptx` | Forbindingsguide, 71 slides → `brandsaarsforbindinger-step-by-step.md` |
| `Brandsårsforbinding tips og tricks -Final.docx` | 0 bytes ved download fra Drive. Intet indhold er brugt herfra. |
| `Anatomy.png`, `Patophysiology.jpg`, `Patophysiology 2.jpg`, `Zone of burns.jpg` | Illustrationer: hudanatomi, patofysiologi, Jacksons zoner |
| `slide-media-map.json` | Slide-nummer → billedfiler, udtrukket fra pptx'en |

De to `.md`-filer er tekstudtrækket, som sammen med "Burns plast surgeon" er samlet
i `../kilder/magnus-materiale.md`.

### Procedurefotos

`pptx-billeder/` indeholder de 71 rå PNG-slides fra pptx'en (73 MB). De er **ikke i
git**: appen serverer de samme 71 motiver komprimeret som JPG fra
`cosurg/public/step-images/` (5 MB), og det er dem `content/trees/dressing-hand-arm.json`
peger på. Navnene svarer 1:1 — `image7.png` her er `image7.jpg` dér. Originalerne
ligger i teamets Google Drive.

Af samme grund er `.pptx`- og `.docx`-originalerne heller ikke i git.

---

# Primary sources — where the knowledge base text comes from

The server does not load this directory. It exists so a claim in a clinical answer can
be traced all the way back to the document it came from. All material here was produced
by the team's own members or by named colleagues, and is cleared for use in the demo
and the submission repo (confirmed 20 Aug 2026).

## The Danish Burn Association — brandsaar.dk

| File | What |
|---|---|
| `lommekort-2019.pdf` | Pocket card, 2019 edition |
| `lommekort-2022.pdf` | Pocket card, 2022 edition |

The site's 34 pages and both pocket cards are extracted into `../kilder/brandsaar-dk.md`.
brandsaar.dk is written by **Rami Mossad Ibrahim**, plastic surgeon and team member.

## Rigshospitalet's burn unit, Section 6052

Via **Magnus Avnstorp**, plastic surgeon and team member.

| File | What |
|---|---|
| `Burns plast surgeon.docx` | Clinical overview of burn management → `burns-plast-surgeon.md` |
| `Brandsårsforbindinger step by step - final edition .pptx` | Dressing guide, 71 slides → `brandsaarsforbindinger-step-by-step.md` |
| `Brandsårsforbinding tips og tricks -Final.docx` | 0 bytes when downloaded from Drive. No content was used from it. |
| `Anatomy.png`, `Patophysiology.jpg`, `Patophysiology 2.jpg`, `Zone of burns.jpg` | Illustrations: skin anatomy, pathophysiology, Jackson's zones |
| `slide-media-map.json` | Slide number → image files, extracted from the pptx |

The two `.md` files are the text extraction, which together with "Burns plast surgeon"
is consolidated into `../kilder/magnus-materiale.md`.

### Procedure photos

`pptx-billeder/` holds the 71 raw PNG slides from the pptx (73 MB). They are **not in
git**: the app serves the same 71 images compressed as JPG from
`cosurg/public/step-images/` (5 MB), and those are what
`content/trees/dressing-hand-arm.json` points at. Names map 1:1 — `image7.png` here is
`image7.jpg` there. The originals live in the team's Google Drive.

For the same reason the `.pptx` and `.docx` originals are not in git either.

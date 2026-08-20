# Knowledge base — what counts as clinical knowledge, and what does not

*(Dansk udgave nedenfor — [spring til den danske udgave](#vidensbasen--hvad-der-er-klinisk-viden-og-hvad-der-ikke-er))*

The MCP server only answers from files it read at startup. Which file sits where is
therefore decisive: it determines what a clinician can end up seeing quoted as
clinical grounds.

## `data/kilder/` — becomes the knowledge base

Every `.md` file here is loaded at startup and can be quoted verbatim as a source in
a clinical answer (`videnbase.ts` reads the whole directory; the `Dockerfile` copies
it to `/app/data/kilder`). Only material from named clinicians belongs here.

| File | Source type | Origin | Sections / excerpts |
|---|---|---|---|
| `vip-rigshospitalet.md` | guideline | **VIP Guideline Rigshospitalet Copenhagen** — the Capital Region's current, versioned Guidelines, Instructions and Policies (VIP), chiefly from Rigshospitalet's Department of Plastic Surgery and Burns Treatment. Each document carries its own version, effective date and named author. | 71 / 583 |
| `brandsaar-dk.md` | guideline | **Dansk Brandsårsforening** (the Danish Burn Association) — clinical burn guidance at brandsaar.dk, published with Rigshospitalet's burn unit. Written by team member Rami Mossad Ibrahim. 34 pages plus both pocket cards as text. | 36 / 128 |
| `magnus-materiale.md` | guideline | **Rigshospitalet, Department of Plastic Surgery and Burns Treatment (Section 6052)** — the "Burns" clinical compendium (cited under the platform name *PlastSurgeon — Validated expert platform*) and the step-by-step dressing guide by Pia Høy, Alice Rimmen, Rikke Holmgaard and Carla Kruse. | 2 / 81 |
| `plastsurgeon-brandsaar.md` | guideline | **PlastSurgeon — Validated expert platform** — the Burn Surgery chapter of the team's own handbook. Written by Rami Mossad Ibrahim, Elisabeth Lauritzen, Magnus Balslev Avnstorp, Rikke Holmgaard and others. | 14 / 96 |
| `plastsurgeon-haandbog.md` | guideline | **PlastSurgeon — Validated expert platform** — the rest of the handbook: microsurgery, facial flaps, wound management, breast surgery, massive weight loss, melanoma, skin transplantation, the plastic surgery dictionary and more. | 394 / 3300 |
| `plastsurgeon-cases.md` | **case** | **PlastSurgeon — Validated expert platform** — case competition entries not also published in JPBRS. | 2 / 44 |
| `jpbrs-cases.md` | **case** | **Journal of Plastic, Breast & Reconstructive Surgery (JPBRS)** — the team's own journal. Every published case, peer-reviewed and open access, with case id, named authors and institution. | 73 / 1188 |

**592 sections → 5,420 searchable excerpts, 2.8 MB of text, 1,837 illustrations.**

Placing a file here asserts that it is clinical evidence. Do not do that with
anything else.

## Source names must carry authority

The name in `SAMLINGER` (`src/videnbase.ts`) is what a clinician sees quoted in a
clinical answer — in `soeg_klinisk_viden`, in `hent_kildeafsnit`, in `list_kilder`,
and on CoSurg's own `/guide` and `/pitfalls` pages. So we name the **institution or
platform behind the material**, never the file the text happened to be extracted
from. A citation reading `Burns plast surgeon.docx` actively undermines the answer it
is supposed to support.

Two rules govern every name:

1. **It must be true.** We do not promote a blog into a guideline.
2. **It must be verifiable.** The reader must be able to look it up. A name that
   sounds authoritative without being so is worse than a filename.

`list_kilder` shows only the part before the first `—`, so the strongest part of the
name goes first.

`VIP Guideline Rigshospitalet Copenhagen` is fixed and used verbatim. All 71 VIP
documents carry that same source name; the individual document's own title belongs in
its `TITEL:` field, together with its version and effective date, so a clinician can
look the instruction up in the VIP portal.

## Guideline or case — the answer must show which

A guideline says *what is recommended*. A clinical case says *what was done for one
patient*. Conflate the two and a single case starts to sound like a recommendation —
exactly the error a clinician cannot spot from the answer.

Every source section therefore carries a `kildetype` (`retningslinje` or `case`), set
in `videnbase.ts` from the filename. Every search hit shows it, `list_kilder` marks
cases with `[CASE]`, and the server's `instructions` require the agent to say so out
loud when it quotes a case. Cases also carry their case id, title and author list.

A new case document must be registered in `SAMLINGER` in `videnbase.ts` with
`kildetype: "case"` — not merely dropped into the directory. An unknown file counts
as a guideline, which would be the wrong assumption for a case. This is exactly why
the PlastSurgeon case-competition entries live in their own file instead of inside
the handbook file: there they would have been labelled as guidelines.

## Illustrations

Image URLs are extracted per section at load time and served by the `hent_billeder`
tool. They are deliberately **not searchable**: an excerpt consisting only of an image
scores highest on precisely the question you asked — its alt text is usually the
chapter or case title — and would answer with a photograph instead of a clinical
statement. Images are reached only through a section you already found. They
supplement an answer; they never replace one.

## Deciding what stays out

A knowledge base does not get better by getting bigger. A duplicate means the same
statement takes two slots in one search result, and a case filed among guidelines gets
quoted as a recommendation. 140 of the PlastSurgeon platform's 534 exported pages were
left out for named reasons, recorded in the header of `plastsurgeon-haandbog.md`:
pages with no text, burn pages already covered verbatim by `plastsurgeon-brandsaar.md`
(plus two aggregate index pages that repeat all of them), lorem-ipsum placeholders,
the history of the field, PhD abstracts, one quiz and two navigation pages.

## `data/originaler/` — primary sources, not loaded

The documents the text in `data/kilder/` was extracted from: PDFs, Word documents and
illustrations. They are kept for provenance — so a claim can be traced back to the
document it came from — but they are not machine-readable to the server and are not
copied into the image.

## `../test-data/` — the organiser's synthetic patient records

Deliberately kept **outside** `data/`. See `cosurg-mcp/test-data/README.md`.
Fictional patients are not evidence. If a synthetic record were ever quoted as a
source in a clinical answer, that answer would be worthless — and nothing in the
answer would reveal it. Hence physical separation rather than a label alone.

The same rule applies to placeholder text inside an otherwise real source: nine
lorem-ipsum pages from the PlastSurgeon handbook were dropped for exactly this reason.

## Rights

Use of the VIP and D4 instructions in independent practice has been cleared and
confirmed by Mia Demant with Anders Klit (MyMedCards, Rigshospitalet plastic surgery).
It is recorded in the header of `vip-rigshospitalet.md`.

---
---

# Vidensbasen — hvad der er klinisk viden, og hvad der ikke er

*(Dette er den danske udgave af afsnittene ovenfor. Engelsk er repoets hovedsprog —
[spring til den engelske udgave](#knowledge-base--what-counts-as-clinical-knowledge-and-what-does-not).)*

MCP-serveren svarer kun ud fra filer den har læst ved opstart. Derfor er det
afgørende hvilke filer der ligger hvor. Skellet i denne mappe er ikke kosmetisk:
det afgør hvad en læge kan komme til at få citeret som klinisk grundlag.

## `data/kilder/` — bliver til vidensbasen

Alle `.md`-filer her indlæses ved opstart og kan citeres ordret som kilde i et
klinisk svar (`videnbase.ts` læser hele mappen; `Dockerfile` kopierer den til
`/app/data/kilder`). Kun materiale fra navngivne fagfolk hører hjemme her.

| Fil | Kildetype | Ophav | Afsnit / uddrag |
|---|---|---|---|
| `vip-rigshospitalet.md` | retningslinje | **VIP Guideline Rigshospitalet Copenhagen** — Region Hovedstadens gældende, versionerede vejledninger, instrukser og politikker, overvejende fra Rigshospitalets Klinik for Plastikkirurgi og Brandsårsbehandling. Hvert dokument bærer sin version, ikrafttrædelsesdato og navngivne forfatter. | 71 / 583 |
| `brandsaar-dk.md` | retningslinje | **Dansk Brandsårsforening** — klinisk brandsårsvejledning på brandsaar.dk, udgivet med Rigshospitalets brandsårsafdeling. Skrevet af holdmedlem Rami Mossad Ibrahim. 34 sider plus begge lommekort som tekst. | 36 / 128 |
| `magnus-materiale.md` | retningslinje | **Rigshospitalet, Klinik for Plastikkirurgi og Brandsårsbehandling (Afsnit 6052)** — kompendiet "Burns" (citeret under platformnavnet *PlastSurgeon — Validated expert platform*) og step-by-step-forbindingsvejledningen af Pia Høy, Alice Rimmen, Rikke Holmgaard og Carla Kruse. | 2 / 81 |
| `plastsurgeon-brandsaar.md` | retningslinje | **PlastSurgeon — Validated expert platform** — håndbogens kapitel Burn Surgery. Skrevet af Rami Mossad Ibrahim, Elisabeth Lauritzen, Magnus Balslev Avnstorp, Rikke Holmgaard m.fl. | 14 / 96 |
| `plastsurgeon-haandbog.md` | retningslinje | **PlastSurgeon — Validated expert platform** — resten af håndbogen: mikrokirurgi, ansigtslapper, sårbehandling, brystkirurgi, massive weight loss, melanom, hudtransplantation og den plastikkirurgiske ordbog. | 394 / 3300 |
| `plastsurgeon-cases.md` | **case** | **PlastSurgeon — Validated expert platform** — case competition-bidrag der ikke også står i JPBRS. | 2 / 44 |
| `jpbrs-cases.md` | **case** | **Journal of Plastic, Breast & Reconstructive Surgery (JPBRS)** — holdets eget tidsskrift. Alle publicerede, peer-reviewede, open access cases med case-id, navngivne forfattere og institution. | 73 / 1188 |

**592 kildeafsnit → 5.420 søgbare uddrag, 2,8 MB tekst, 1.837 illustrationer.**

Lægger man en fil her, påstår man samtidig at den er klinisk evidens. Gør det ikke
med noget andet.

## Kildenavne skal bære autoritet

Navnet i `SAMLINGER` er det en læge ser citeret i et klinisk svar — og på CoSurgs
`/guide` og `/pitfalls`. Derfor navngiver vi den institution eller platform der står
bag, ikke den fil teksten tilfældigvis blev udtrukket af. En kildehenvisning der
lyder `Burns plast surgeon.docx` underminerer aktivt det svar den skulle bære.

To regler gælder: navnet skal være **sandt** (vi opgraderer ikke en blog til en
retningslinje), og det skal kunne **efterprøves** af den der læser det. Et navn der
lyder autoritativt uden at være det, er værre end et filnavn.

`VIP Guideline Rigshospitalet Copenhagen` er fastlagt og bruges ordret. Alle 71
VIP-dokumenter bærer det samme kildenavn; det enkelte dokuments egen titel hører
hjemme i `TITEL:` sammen med version og ikrafttrædelsesdato.

## Retningslinje eller case — forskellen skal kunne ses på svaret

En retningslinje siger *hvad der anbefales*. En klinisk case siger *hvad der blev
gjort for én patient*. Blandes de sammen, kan et enkeltstående forløb komme til at
lyde som en anbefaling — og det er præcis den fejl en læge ikke kan se på svaret.

Derfor bærer hvert kildeafsnit en `kildetype` (`retningslinje` eller `case`), sat i
`videnbase.ts` ud fra filnavnet. Hvert søgeresultat viser den, `list_kilder` mærker
cases med `[CASE]`, og serverens `instructions` kræver at agenten siger det højt når
den gengiver en case. Cases bærer desuden deres case-id, titel og forfatterliste.

Et nyt casedokument skal derfor registreres i `SAMLINGER` i `videnbase.ts` med
`kildetype: "case"` — ikke bare lægges i mappen. En ukendt fil regnes som
retningslinje, og det ville være den forkerte antagelse for en case. Det er præcis
derfor PlastSurgeons case competition-bidrag har deres egen fil frem for at ligge i
håndbogsfilen — dér ville de være mærket som retningslinjer.

## Illustrationer

Billed-URL'er udtrækkes pr. afsnit ved indlæsning og hentes med `hent_billeder`. De
er bevidst **ikke søgbare**: et uddrag der kun er et billede scorer højest på præcis
det spørgsmål man stiller, fordi alt-teksten ofte er kapitlets eller casens titel, og
ville svare med et foto i stedet for et klinisk udsagn. Billeder nås kun gennem et
afsnit man allerede har fundet — de supplerer et svar, de erstatter det aldrig.

## At beslutte hvad der IKKE skal med

En vidensbase bliver ikke bedre af at være større. En dublet betyder at det samme
udsagn optager to pladser i ét søgeresultat, og en case der ligger blandt
retningslinjer bliver citeret som en anbefaling. 140 af PlastSurgeon-platformens 534
eksporterede sider er udeladt med navngiven begrundelse i hovedet af
`plastsurgeon-haandbog.md`: sider uden tekst, brandsårssider der allerede står ordret
i `plastsurgeon-brandsaar.md` (plus to samlesider der gengiver dem alle igen), lorem
ipsum-pladsholdere, fagets historie, PhD-resuméer, en quiz og to navigationssider.

## `data/originaler/` — primærkilder, indlæses ikke

De dokumenter teksten i `data/kilder/` er udtrukket fra: PDF'er, Word-dokumenter og
illustrationer. De ligger her for proveniensens skyld — så en påstand kan spores
tilbage til det dokument den kom fra — men de er ikke maskinlæsbare for serveren og
kopieres ikke ind i imaget.

## `../test-data/` — arrangørens syntetiske patientjournaler

Ligger bevidst **uden for** `data/`. Se `cosurg-mcp/test-data/README.md`.
Opdigtede patienter er ikke evidens. Bliver en syntetisk journal nogensinde citeret
som kilde i et klinisk svar, er svaret værdiløst — og det ville ikke kunne ses på
svaret. Derfor er de fysisk adskilt frem for kun at være markeret.

Samme regel ramte ni lorem ipsum-sider i PlastSurgeon-håndbogen: opdigtet fyldtekst
i en ellers ægte kilde er den samme fejl i mindre format.

## Rettigheder

Brugen af VIP- og D4-instrukser i selvstændig virksomhed er afklaret og bekræftet af
Mia Demant med Anders Klit (MyMedCards, Rigshospitalets plastikkirurgi). Det er
noteret i hovedet af `vip-rigshospitalet.md`.

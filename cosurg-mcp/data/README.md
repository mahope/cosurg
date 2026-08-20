# Knowledge base — what counts as clinical knowledge, and what does not

*(Dansk udgave nedenfor — [spring til den danske udgave](#vidensbasen--hvad-der-er-klinisk-viden-og-hvad-der-ikke-er))*

The MCP server only answers from files it read at startup. Which file sits where is
therefore decisive: it determines what a clinician can end up seeing quoted as
clinical grounds.

## `data/kilder/` — becomes the knowledge base

Every `.md` file here is loaded at startup and can be quoted verbatim as a source in
a clinical answer (`videnbase.ts` reads the whole directory; the `Dockerfile` copies
it to `/app/data/kilder`). Only material from named clinicians belongs here.

| File | Source type | Origin |
|---|---|---|
| `brandsaar-dk.md` | guideline | brandsaar.dk — the Danish Burn Association. Written by team member Rami Mossad Ibrahim. 34 pages plus both pocket cards as text. |
| `magnus-materiale.md` | guideline | Rigshospitalet's burn unit, Section 6052, via team member Magnus Avnstorp: the "Burns plast surgeon" document and the step-by-step dressing guide. |
| `plastsurgeon-brandsaar.md` | guideline | beta.plastsurgeon.com — the team's own handbook, the Burn Surgery chapter. Written by Rami Mossad Ibrahim, Elisabeth Lauritzen, Magnus Balslev Avnstorp, Rikke Holmgaard and others. |
| `jpbrs-cases.md` | **case** | beta.jpbrs.com — the team's own journal, the Journal of Plastic, Breast & Reconstructive Surgery. Peer-reviewed, open access burn cases with named authors and institution. |

Placing a file here asserts that it is clinical evidence. Do not do that with
anything else.

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
as a guideline, which would be the wrong assumption for a case.

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

| Fil | Kildetype | Ophav |
|---|---|---|
| `brandsaar-dk.md` | retningslinje | brandsaar.dk — Dansk Brandsårsforening. Skrevet af holdmedlem Rami Mossad Ibrahim. 34 sider plus begge lommekort som tekst. |
| `magnus-materiale.md` | retningslinje | Rigshospitalets brandsårsafdeling, Afsnit 6052, via holdmedlem Magnus Avnstorp: "Burns plast surgeon"-dokumentet og step-by-step-forbindingsguiden. |
| `plastsurgeon-brandsaar.md` | retningslinje | beta.plastsurgeon.com — holdets egen håndbog, kapitlet Burn Surgery. Skrevet af Rami Mossad Ibrahim, Elisabeth Lauritzen, Magnus Balslev Avnstorp, Rikke Holmgaard m.fl. |
| `jpbrs-cases.md` | **case** | beta.jpbrs.com — holdets eget tidsskrift, Journal of Plastic, Breast & Reconstructive Surgery. Peer-reviewede, open access brandsårscases med navngivne forfattere og institution. |

Lægger man en fil her, påstår man samtidig at den er klinisk evidens. Gør det ikke
med noget andet.

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
retningslinje, og det ville være den forkerte antagelse for en case.

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

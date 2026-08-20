# Vidensbasen — hvad der er klinisk viden, og hvad der ikke er

*(English below)*

MCP-serveren svarer kun ud fra filer den har læst ved opstart. Derfor er det
afgørende hvilke filer der ligger hvor. Skellet i denne mappe er ikke kosmetisk:
det afgør hvad en læge kan komme til at få citeret som klinisk grundlag.

## `data/kilder/` — bliver til vidensbasen

Alle `.md`-filer her indlæses ved opstart og kan citeres ordret som kilde i et
klinisk svar (`videnbase.ts` læser hele mappen; `Dockerfile` kopierer den til
`/app/data/kilder`). Kun materiale fra navngivne fagfolk hører hjemme her.

| Fil | Ophav |
|---|---|
| `brandsaar-dk.md` | brandsaar.dk — Dansk Brandsårsforening. Skrevet af holdmedlem Rami Mossad Ibrahim. 34 sider plus begge lommekort som tekst. |
| `magnus-materiale.md` | Rigshospitalets brandsårsafdeling, Afsnit 6052, via holdmedlem Magnus Avnstorp: "Burns plast surgeon"-dokumentet og step-by-step-forbindingsguiden. |

Lægger man en fil her, påstår man samtidig at den er klinisk evidens. Gør det ikke
med noget andet.

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

---

# Knowledge base — what counts as clinical knowledge, and what does not

The MCP server only answers from files it read at startup. Which file sits where is
therefore decisive: it determines what a clinician can end up seeing quoted as
clinical grounds.

## `data/kilder/` — becomes the knowledge base

Every `.md` file here is loaded at startup and can be quoted verbatim as a source in
a clinical answer (`videnbase.ts` reads the whole directory; the `Dockerfile` copies
it to `/app/data/kilder`). Only material from named clinicians belongs here.

| File | Origin |
|---|---|
| `brandsaar-dk.md` | brandsaar.dk — the Danish Burn Association. Written by team member Rami Mossad Ibrahim. 34 pages plus both pocket cards as text. |
| `magnus-materiale.md` | Rigshospitalet's burn unit, Section 6052, via team member Magnus Avnstorp: the "Burns plast surgeon" document and the step-by-step dressing guide. |

Placing a file here asserts that it is clinical evidence. Do not do that with
anything else.

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

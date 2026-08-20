# Corti Hack for Health — 20.–21. august 2026

Arbejdsmappe til hackathon (endnu ikke git — oprettes når projektet vælges torsdag morgen).

## Holdet

- **Mads** — udvikler (Claude Code). **Smutter fredag kl. 11** → al kode skal være færdig torsdag aften / fredag tidlig morgen.
- **Magnus Avnstorp** — plastikkirurg. Præsenterer fredag.
- **Rami Mossad Ibrahim** — plastikkirurg. Præsenterer fredag.

Konsekvens: Demoen skal kunne køres af Magnus og Rami alene. Det kræver: stabil deploy, preloadede transskripter som fallback (eksplicit tilladt), og et demo-manuskript.

## Mappen

| Sti | Indhold |
|---|---|
| `docs/participant-brief.md` | Challenge, regler, bedømmelse (scrapet fra Notion) |
| `docs/schedule.md` | Tidsplan onsdag–fredag |
| `docs/corti-llms-full.txt` | **Hele docs.corti.ai i markdown (2,7 MB)** — grep i denne i stedet for at browse |
| `docs/corti-llms-index.txt` | Indeks med URL + beskrivelse pr. docs-side |
| `brainstorm/ideer.md` | Idékatalog med scoring og anbefaling |
| `datasets/` | Hackathon-datasæt fra arrangørens Google Drive (inkl. MedDictate) |

## Reglerne — TL;DR

1. **Mindst 4 af 5 produktområder:** ambient STT · dictation STT · text generation · agentic framework · medical coding.
2. **Kun Corti som AI-API.** Undtagelser: TTS-modeller, OCR-modeller og MCP-forbindelser koblet via Cortis agentic framework.
3. **Intet prewritten code fra egne projekter** (ingen genbrug fra SurgAI!). Open source/public packages OK.
4. Max 4 pr. hold. Submission = GitHub-repo inkl. en fil der lister andre produkter/datasæt brugt.
5. **Code freeze fredag 14:00.** Præsentation: 5 min + 2 min Q&A, alle præsenterer sig (navn, holdnavn, nummer). Transskript må preloades, men **live STT skal demonstreres**.

## Bedømmelse (ligeligt vægtet)

Klinisk relevans · Brug af Corti API · Fungerende prototype · Insight & ambition · Crowd voting.
Superlativer à €250: Best Commercial Idea (m. mentorship/investorintro) · Best UX · Best Use of Agentic Framework · Mystery.

## Nøgle-tidspunkter

| Hvornår | Hvad |
|---|---|
| To 9:00 | Døre åbner, prompt start |
| To 9:30–10:00 | Én sætnings problem + løsning + user journey — så hacking |
| To 22:00 | Kontor lukker (må arbejde videre off-site) |
| **Fr 11:00** | **Mads smutter — kode SKAL være færdig** |
| Fr 14:00 | Code freeze + GitHub-submission |
| Fr 14:00–15:30 | Præsentationer (Magnus + Rami) |
| Fr ~16:30 | Prisoverrækkelse |

## Links

- API-docs: https://docs.corti.ai (lokalt: `docs/corti-llms-full.txt`)
- Datasæt (Drive): https://drive.google.com/drive/folders/1k1GgiVBbL3KoXqlMQFCOsg1PVTmei8bW
- Discord: https://discord.gg/WwSjyuZKq
- Lovable (partner, gratis credits): https://lovable.dev
- Kontakt: James Kane — jka@corti.ai
- Adresse: Kuglagårdsvej 2, 2. sal, 1434 København K

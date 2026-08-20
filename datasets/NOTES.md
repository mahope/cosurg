# Datasæt-noter

Hentet 19/8 2026 fra arrangørens Google Drive: https://drive.google.com/drive/folders/1k1GgiVBbL3KoXqlMQFCOsg1PVTmei8bW

## Indhold

- **Audio Samples/** — 24 engelske lydfiler (m4a + wav), sample_1–29 med huller (10, 23–25, 27 findes ikke i Drive-mappen). Klar til STT-test.
- **Text Samples/** — 6 syntetiske patientjournaler (markdown pr. patient: patient, conditions, medications, labs, vitals, encounters m.m.):
  - `aisha_rahman` — cancer-survivorship, manglende opfølgning
  - `david_kim` — onkologi, under behandling
  - `elena_petrova` — pneumoni + opfølgning
  - `harold_mitchell` — geriatri (m. caregiver + funktionsvurdering)
  - `jamal_wright` — **diabetisk fodsår** (tættest på vores sår-domæne!)
  - `jane_smith` — kardiologi, indlæggelse + udskrivelse + opfølgning

## Observationer

1. **Ingen plastikkirurgi-cases** — datasættet er almen medicin. Vores egne scenarier er tilladt ("anything publicly available is allowed", og transskripter må preloades) → Magnus/Rami kan indtale egne sår-cases torsdag morgen som demo-data.
2. Hver patient har **flere encounters over tid** + strukturerede baggrundsfiler → datasættet er tydeligvis designet til "sammenlign samtale med eksisterende journal"-opgaver (idé 3 Journalvask) og longitudinelle idéer (idé 7).
3. `jane_smith/use-cases.md` er **tom på Drive** (0 bytes, bekræftet med Content-Length: 0) — sandsynligvis en fejl fra arrangøren; filen findes ikke hos andre patienter. Spørg evt. James Kane.

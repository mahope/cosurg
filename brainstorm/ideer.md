# Idékatalog — Corti Hack for Health

Grundpræmis: Vi bygger i samme domæne som SurgAI (akut plastikkirurgi, sårbehandling, skadestue) — det er dér Magnus og Rami har klinisk autoritet, og klinisk relevans er 1/5 af scoren. Men **koden skal skrives fra bunden**, og vi må ikke bare genbygge SurgAI (eller Cortis egen scribe — se anti-idéer nederst).

**Krav-tjek pr. idé:** mindst 4 af 5 — Ambient STT (A) · Dictation STT (D) · Text generation (T) · Agentic framework (G) · Medical coding (K).

---

## Idé 1: "Vagtskiftet" — ER Handoff Guardian

**Problem:** På skadestuen bliver lægen afbrudt 15–60 min. midt i forløb, og ved vagtskifte overleveres patienter mundtligt på 30 sekunder. Kritisk information tabes — det er en af de hyppigste kilder til fejl i akutmodtagelser. (Dette var den ORIGINALE SurgAI-indsigt — men vinklen handoff/afbrydelse er ubygget.)

**Koncept:** Ambient lytning på encounters gennem vagten. Når lægen kaldes væk eller vagten slutter, genererer agenten en struktureret **ISBAR-overlevering** pr. patient: hvad er sagt, hvad er gjort, hvad er UAFKLARET, røde flag der ikke er adresseret. Den nye læge dikterer sin kvittering + plan (dictation). Koder genereres løbende, så intet encounter ender ufaktureret.

- **Områder:** A + D + T + G + K — alle 5, og både ambient og dictation har en ÆGTE rolle (ikke påklistret).
- **Territorium:** Care coordination and handoffs (mindst besatte territorium — de fleste hold bygger scribes eller patient-apps).
- **Judging-fit:** Insight/ambition høj (uafklaret-listen er den nye idé: ikke hvad der blev sagt, men hvad der MANGLER). Klinisk relevans: Magnus/Rami kan fortælle førstehåndshistorier i pitchen.
- **Demo (2 klinikere alene):** Rami spiller læge 1 med preloadet transskript × 2 patienter; Magnus viser live ambient på patient 3; vagtskifte-knap → ISBAR-tavle; Magnus dikterer kvittering live.
- **Risiko/indsats:** Middel. Kernen er 1 flow + 1 skærm. "Uafklaret"-detektion er prompt-arbejde, ikke infrastruktur.

## Idé 2: "Suturguiden" — procedure-narrator med step-tracking

**Problem:** Under en sutur/sårrevision skal yngre læger huske alle trin (tetanus? skylning? testet fleksorsener? antibiotika-indikation?). Operationsnotatet skrives bagefter fra hukommelsen.

**Koncept:** Lægen har dictation kørende UNDER proceduren og fortæller hvad hen gør ("skyller med 500 ml saltvand… lukker med 5-0 nylon"). En agent tracker trinnene mod en behandlingsguide (decision-tree-viden som Magnus/Rami skriver på dagen — indhold er ikke kode!), og siger til via TTS hvis et kritisk trin springes over ("tetanusstatus ikke nævnt"). Ved afslutning: færdigt operationsnotat + procedurekoder.

- **Områder:** D + T + G + K (4 af 5; ambient kan tilføjes som for-samtalen med patienten → 5).
- **Judging-fit:** Wow-faktor høj (live "AI'en siger fra under proceduren"), Best Use of Agentic Framework-kandidat. Udnytter holdets unikke aktiv: step-by-step kirurgiske cases.
- **Demo:** Magnus "opererer" en teatersvamp og dikterer live — springer bevidst tetanus over — TTS'en fanger det. Meget teatralsk, crowd voting-venlig.
- **Risiko:** Realtids-step-tracking skal være hurtig nok; kræver at dictation-streamen kan konsumeres løbende (verificér med Corti-ingeniørerne torsdag 9:05).

## Idé 3: "Journalvask" — copy-paste-detektoren

**Problem (direkte fra brief'ets eksempelliste):** Under tidspres copy-pastes gamle notater, så forældet/forkert info føres videre i journalen.

**Koncept:** Upload/indsæt den gamle journalnote (evt. via OCR — tilladt), optag dagens samtale ambient. Agenten sammenligner: hvad i den gamle note MODSIGES af dagens samtale ("står som ryger — sagde i dag han stoppede for 2 år siden"), hvad er forældet, hvad er ubekræftet. Genererer en renset, opdateret note + opdaterede koder (diagnoser der ikke længere er aktive, fjernes).

- **Områder:** A + T + G + K (+ D til lægens rettelser → 5).
- **Judging-fit:** Klinisk relevans meget høj (alle klinikere i rummet nikker), insight høj ("diff'en mellem journal og virkelighed" er et godt billede). Best Commercial Idea-kandidat — CDI/journalkvalitet er et betalende marked.
- **Demo:** Preloadet gammel note + live samtale mellem Magnus og Rami → rød/grøn diff på skærmen.
- **Risiko:** Lav-middel. Diff-visningen er den svære UX-del.

## Idé 4: "Med Hjem"-følgesedlen — patient aftercare companion

**Problem:** Patienten glemmer 40–80 % af det sagte. Sårpleje-instruktioner gives mundtligt på 60 sekunder på vej ud ad døren.

**Koncept:** Fra dagens samtale genereres automatisk en patientvenlig efterbehandlingsseddel: hvad skete der, hvordan passer du såret, alarmsymptomer, hvornår fjernes suturer — på patientens eget sprog, oplæst med TTS (tilladt), som QR-kode/link. En opfølgnings-agent kan dagen efter stille kontrolspørgsmål ("er der rødme?") og eskalere.

- **Områder:** A + T + G + K (koder driver hvilken efterbehandlings-skabelon der vælges — fx bidsår ≠ brandsår) (+ D → 5).
- **Judging-fit:** Crowd voting-magnet, Best UX-kandidat. Patient understanding-territoriet.
- **Risiko:** Lav — men også lavere ambition; mange hold lander nok her. Differentiator skal være koden-styrer-indholdet-mekanikken og opfølgningsagenten.

## Idé 5: "Anamnese-navigatøren" — struktureret historik-optagelse

**Problem (fra brief'et):** Patienter ved ikke hvad der er klinisk relevant; anamnesen bliver hullet når patienten forklarer dårligt eller lægen afbrydes.

**Koncept:** Ambient lytning mens patienten fortæller frit. En agent med spørgeguide-ekspert (questionnaire expert findes i Cortis agentic framework) viser live på skærmen: hvilke anamnese-elementer er dækket (grøn), hvilke mangler (rød) — allergier? antikoagulantia? tetanus? Lægen ser med ét blik hvad der mangler at blive spurgt om. Til sidst: komplet anamnese-note + koder.

- **Områder:** A + T + G + K (+ D → 5).
- **Judging-fit:** In-encounter intelligence; meget demonstrérbar ("se tjeklisten fyldes ud mens vi taler"). God API-brug (questionnaire experts er en underudnyttet Corti-feature).
- **Risiko:** Middel — realtids-opdatering af tjeklisten kræver løbende processering af interim transcripts.

## Idé 6: "Blindspot" — sjældne tilstande-vagten

**Problem (fra brief'et):** Sjældne tilstande/kombinationer opdages sent, fordi ingen tænker på dem.

**Koncept:** Efter (eller under) samtalen kører en agent-pipeline: symptomkombinationer fra samtalen → differentialliste med eksplicit "Can't Miss"-tier → hvad ville udelukke/bekræfte hver. Nekrotiserende fasciitis vs. cellulitis er den oplagte plastikkirurgiske case (timekritisk, dødelig, overses).

- **Områder:** A + T + G + K.
- **Judging-fit:** Klinisk relevans skyhøj hvis casen er nekrotiserende fasciitis (alle kender frygten). MEN: tættest på hvad SurgAI allerede gør → svagere "fra bunden"-optik, og diagnostisk AI trigger flere spørgsmål fra dommerne om validering.
- **Risiko:** Middel + omdømmerisiko ved hallucination i live-demo.

## Idé 7: "Flokken" — mønstre på tværs af encounters

**Problem:** Ingen kigger på tværs af tusind samtaler (population/longitudinal-territoriet).

**Koncept:** Batch-kør MedDictate-datasættet gennem STT + coding → dashboard: hyppigste uadresserede røde flag, antibiotika-variation ved bidsår, dokumentationshuller pr. skadestype. "Kvalitetsafdelingens nye røntgenblik."

- **Områder:** A/D (batch) + T + G + K.
- **Judging-fit:** Insight høj, men prototypen føles som BI — svagere live-demo, svagere crowd voting. Afhænger 100 % af datasættets kvalitet/størrelse.
- **Risiko:** Høj (datasæt-afhængig). Bedre som SEKUNDÆR feature: "og fordi alt kodes, får kvalitetschefen dette dashboard gratis."

## Idé 8: "Henvisningsautomaten" — fra skadestue til plastikkirurgisk afdeling

**Problem:** Henvisninger fra skadestue til plastikkirurgi er ofte ufuldstændige (mangler foto-beskrivelse, tetanusstatus, tid siden skade) → afvisninger og forsinkelser.

**Koncept:** Fra encounter-samtalen genererer agenten en henvisning, og en "modtager-agent" (plastikkirurgisk bagvagt) kvalitetstjekker den mod modtagekrav og sender mangler tilbage — to agenter der forhandler. Koder + hastegrad sættes automatisk.

- **Områder:** A + D + T + G + K.
- **Judging-fit:** Care coordination; to-agent-arkitekturen er en Best Use of Agentic Framework-kandidat. Magnus/Rami kender begge sider af henvisningen personligt.
- **Risiko:** Middel — to-agent-flowet skal times stramt for ikke at æde demo-minutter.

## Idé 9: "Visitatoren" — tele-triage til akuttelefonen (1813)

**Problem:** Ved akuttelefonen (1813/lægevagt) beskriver borgeren skaden mundtligt, og visitatoren skal på få minutter afgøre: hjemme, egen læge, skadestue eller ambulance. Forbrændinger og bidsår fejlvisiteres begge veje — og visitationsnotatet skrives bagefter fra hukommelsen.

**Koncept:** Ambient STT på opkaldet. En agent med spørgeguide-ekspert lytter med og viser visitatoren live: hvilke afklarende spørgsmål mangler (forbrænding: udbredelse? lokalisation? cirkulær?), og foreslår disposition med begrundelse. Ved afslutning: færdigt visitationsnotat + koder. Dansk vinkel dommerne kender personligt — alle i rummet har ringet til 1813.

- **Områder:** A + T + G + K (+ D til visitatorens efter-diktat → 5).
- **Judging-fit:** Klinisk relevans høj og umiddelbart forståelig for crowd voting ("AI'en der lytter med på 1813"). In-encounter + care coordination på én gang.
- **Demo:** Rami ringer "ind" (spiller borger med skoldet hånd), Magnus er visitator — skærmen viser spørgsmålene fyldes ud live og dispositionen skifte fra "egen læge" til "skadestue" da cirkulær forbrænding nævnes.
- **Risiko:** Middel — telefonlyd er sværere for STT end rumlyd; test med lav kvalitet torsdag. Konceptuelt tæt på idé 5 (samme "mangler at blive spurgt"-mekanik, ny kontekst).

## Idé 10: "Følsimulatoren" — AI-patienten der træner forvagten

**Problem:** Yngre læger møder deres første ansigtsbid eller håndforbrænding LIVE på en nattevagt. Simulationstræning findes, men kræver skuespillere og planlægning. (Uddannelse er holdets DNA — PlastSurgeon ER en læringsplatform.)

**Koncept:** Vend det hele om: **agenten spiller patienten.** Den studerende interviewer AI-patienten med stemme (STT ind, TTS ud — patienten "taler" tilbage), patienten er promptet med en case inkl. skjulte røde flag ("nævner kun antikoagulantia hvis der spørges til medicin"). Bagefter scorer en bedømmer-agent: hvilke anamnese-elementer blev dækket, hvilke røde flag blev misset, og den studerendes dikterede note + koder sammenlignes med facit.

- **Områder:** A + D + T + G + K — alle 5, plus TTS (tilladt). Dictation bruges ægte (den studerendes note), ambient til selve interviewet, coding som del af scoringen.
- **Judging-fit:** Crowd voting-magnet (publikum SER en samtale med en talende AI-patient), Best Use of Agentic Framework-kandidat (patient-agent + bedømmer-agent), Best Commercial Idea-kandidat (medicinsk uddannelse er et betalende marked, og holdet har allerede distributionen via PlastSurgeon-økosystemet — nævn det IKKE som genbrug, kun som marked).
- **Demo:** Selvbærende — **ingen EHR, ingen journal-data, ingen eksterne afhængigheder.** Magnus interviewer AI-patienten live, misser bevidst tetanus, scoringen afslører det. Robusthed i top når Mads er væk.
- **Risiko:** Lav-middel. TTS-latens kan gøre samtalen hakkende — hav tekst-fallback hvor patienten "svarer" på skrift. Afklaring torsdag: må TTS være browser/ElevenLabs, eller skal den kobles via Cortis agentic framework?

## Idé 11: "Stuegangen" — multi-patient stuegangs-copilot

**Problem:** På stuegang ser lægen 10–15 patienter i træk. Noterne skrives timer senere, planer blandes sammen, og opgaver ("bestil rtg. af hånd, seponér antibiotika") glemmes mellem stuerne.

**Koncept:** Ambient STT kører gennem HELE stuegangen. Agenten segmenterer samtalen pr. patient (navne/stue-markører — lægen siger "næste: stue 4, Hansen"), og genererer pr. patient: statusopdatering, ændringer i plan, opgaveliste og koder. Til sidst: samlet stuegangs-tavle med alle opgaver, klar til afvinkning — og uafklarede punkter markeret.

- **Områder:** A + D + T + G + K (dictation til rettelser pr. patient).
- **Judging-fit:** Insight høj — segmenterings-problemet ("én lydstrøm, mange patienter") er teknisk interessant og uudforsket; de fleste scribes antager ét encounter. Klinisk relevans høj for hospitalslæger.
- **Demo:** Preloadet stuegang med 3 patienter + live tredje patient. Tavlen fyldes patient for patient.
- **Risiko:** Middel-høj — segmenteringen SKAL virke i demoen, og fejl her ser dumme ud ("Hansens antibiotika står under Jensen"). Kræver disciplineret demo-manuskript med tydelige patient-markører.

## Idé 12: "Informeret" — samtykke-vagten

**Problem:** Informeret samtykke før procedurer skal indeholde bestemte elementer (indgrebets art, risici, alternativer, ret til at fortryde) — men gives mundtligt under tidspres, og dokumentationen bagefter er ofte én linje: "pt. informeret, samtykker". Medikolegalt er det lægens ord mod patientens.

**Koncept:** Ambient STT på samtykkesamtalen. Agenten tjekker mod en krav-tjekliste: blev risikoen for nerveskade faktisk NÆVNT? Blev alternativer nævnt? Viser live hvad der mangler at blive sagt, før patienten skriver under. Genererer derefter samtykke-dokumentation med citater fra samtalen ("risiko for arvæv blev forklaret: '…'") + procedurekoder.

- **Områder:** A + T + G + K (+ D til lægens supplement → 5).
- **Judging-fit:** Klinisk relevans høj og skarpt afgrænset — samtykke er et universelt smertepunkt, og "dokumentation med belæg i citater" er en stærk transparens-historie (matcher holdets "ikke en black box"-princip). Best Commercial Idea-kandidat (medikolegal dokumentation er et forsikrings-/complianceprodukt).
- **Demo:** Magnus informerer Rami (patient) om en sårrevision, glemmer bevidst at nævne alternativer — tjeklisten hænger på rød indtil han siger det. Simpelt, teatralsk, robust.
- **Risiko:** Lav. Én samtale, én tjekliste, ét dokument. Den mest byggevenlige af alle idéerne.

## Idé 13: "Efterkoderen" — kodning der betaler huslejen

**Problem:** Hospitaler mister betydelig indtjening fordi encounters underkodes — bidiagnoser og procedurer der faktisk blev NÆVNT i samtalen, når aldrig journalen eller kodningen. Omvendt giver overkodning compliance-problemer.

**Koncept:** Kør encounter-samtaler (live eller batch fra datasættet) gennem STT + medical coding, og sammenlign med hvad der FAKTISK blev kodet (fra journal-data — datasættets Text Samples har både encounters og strukturerede data). En revisor-agent forklarer hver difference med citat fra samtalen: "Diabetes nævnt som aktiv komorbiditet i samtalen, men ikke kodet — estimeret DRG-effekt: X." Dashboard med fundne koder pr. encounter.

- **Områder:** A/D + T + G + K — og **coding er STJERNEN**, ikke et vedhæng. Ingen andre hold gør coding til hovedproduktet.
- **Judging-fit:** Best Commercial Idea-topkandidat (ren ROI-historie: "vi fandt X manglende koder i jeres eget datasæt"). Datasættet er skræddersyet til det (encounters + strukturerede journaldata pr. patient). Insight: "coding som revision, ikke som produktion."
- **Demo:** Batch-resultat på skærmen ("i 6 patienter fandt vi N ukodede fund") + ét live encounter der kodes mens publikum ser på.
- **Risiko:** Middel — afhænger af hvilke kodesystemer Cortis coding-API leverer (ICD-10? SKS? afklar torsdag kl. 9), og "sammenlign med faktisk kodning" kræver at vi konstruerer facit fra datasættets journal-filer.

---

## Anti-idéer (byg IKKE)

- **En ambient scribe der laver journalnotat.** Det er Cortis eget kerneprodukt (Corti Assistant) — nul insight-point, og dommerne er dem der byggede det.
- **"ChatGPT for kirurger" / opslagsagent.** Det ER SurgAI — både "fra bunden"-reglen og vores egen historie gør det til et dårligt valg.
- **Ren diagnose-AI uden menneske-i-løkken.** Kliniske advisorer vil flå den i Q&A.

---

## Scoring (1–5)

| # | Idé | Klinisk relevans | API-brug | Byggbar to. + fr. formiddag | Insight | Crowd/demo | Sum |
|---|---|---|---|---|---|---|---|
| 1 | Vagtskiftet | 5 | 5 | 4 | 5 | 4 | **23** |
| 10 | Følsimulatoren | 4 | 5 | 4 | 4 | 5 | **22** |
| 2 | Suturguiden | 4 | 5 | 3 | 5 | 5 | **22** |
| 12 | Informeret | 4 | 4 | 5 | 4 | 4 | **21** |
| 3 | Journalvask | 5 | 4 | 4 | 4 | 4 | **21** |
| 13 | Efterkoderen | 4 | 5 | 3 | 5 | 3 | 20 |
| 5 | Anamnese-navigatøren | 4 | 5 | 3 | 4 | 4 | 20 |
| 4 | Med Hjem | 4 | 4 | 5 | 3 | 4 | 20 |
| 9 | Visitatoren | 4 | 4 | 3 | 4 | 4 | 19 |
| 8 | Henvisningsautomaten | 4 | 5 | 3 | 4 | 3 | 19 |
| 11 | Stuegangen | 4 | 5 | 2 | 5 | 3 | 19 |
| 6 | Blindspot | 4 | 4 | 3 | 3 | 3 | 17 |
| 7 | Flokken | 3 | 4 | 2 | 4 | 2 | 15 |

## Anbefaling

**Førstevalg: Idé 1 "Vagtskiftet"** — eneste idé der bruger alle 5 områder organisk, besætter et tyndt befolket territorium, bygger på holdets egen originale indsigt (lægen der kaldes væk), og demoen kan køres af to klinikere uden Mads. **Kombinér med idé 4 som slutsekvens:** når patienten afsluttes, falder "Med Hjem"-sedlen ud automatisk — så rammer vi både koordinerings- og patient-territoriet i ét flow.

**Andetvalg: Idé 2 "Suturguiden"** hvis vi torsdag morgen bekræfter med Corti-folkene at dictation-streamen kan konsumeres i realtid med lav nok latenstid. Højeste demo-wow, men størst teknisk risiko.

**Sikkerhedsnet: Idé 3 "Journalvask"** — mindst bevægelige dele, briefen nævner selv problemet, og den kan bygges færdig på én dag hvis noget andet fejler.

**Efter anden runde (idé 9–13):** To nye udfordrere. **Idé 10 "Følsimulatoren"** er den mest robuste demo af alle (helt selvbærende — ingen journal-data, ingen integrationer, publikum SER en talende AI-patient) og rammer tre superlativer på én gang; den er det bedste valg hvis crowd voting og demo-sikkerhed vægtes højest. **Idé 12 "Informeret"** er den mest byggevenlige overhovedet — vælg den hvis torsdagen skrider. Vagtskiftet står stadig som førstevalg på insight og territorium, men Følsimulatoren er nu det reelle alternativ frem for Suturguiden (samme wow, lavere teknisk risiko).

## Skal afklares torsdag kl. 9 (med Corti-ingeniørerne)

1. **Understøtter Corti STT dansk?** Hvis nej/dårligt → demo på engelsk (afgør manuskriptet).
2. Kan interim transcripts konsumeres live med lav latenstid (afgør idé 2 og 5)?
3. Hvilke kodesystemer leverer medical coding (ICD-10, SKS?) — og på hvilke sprog?
4. Rate limits / credits på hackathon-nøglerne (batch-idéer afhænger af det).
5. Må TTS køre via ElevenLabs/browser-TTS, eller skal det kobles gennem agentic framework?

## Demo-disciplin (fordi Mads er væk fra fredag 11)

- Deploy torsdag aften — IKKE fredag morgen. Frys main når Mads går.
- Preloadede transskripter til alt undtagen det ene obligatoriske live STT-moment.
- Demo-manuskript med præcise klik skrives torsdag aften; Magnus og Rami gennemspiller det EN gang fredag 9–10 mens Mads stadig er der.
- Fallback-video af hele flowet optages torsdag nat (skærmoptagelse) — hvis wifi/API dør, viser de videoen og kører kun STT live.

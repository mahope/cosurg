# DEMO — CoSurg, fredag 14:00–15:30

**Til Magnus og Rami. I kører den alene. Mads er gået kl. 11.**

Fem minutters demo + to minutters spørgsmål.
Læs afsnit 1 og 2 igennem én gang. Kør prøven i afsnit 2 færdig, før I gør noget andet.
Går noget galt undervejs: afsnit 5. Der står præcis hvad I gør.

**URL:** `https://cosurg.com`
**Sproget under demoen: engelsk.** Appen taler og lytter på engelsk. Alle replikker
til mikrofonen står herunder på engelsk — de skal siges præcis som de står.
Skal I køre på dansk i stedet, står de danske replikker i parentes.

---

## 1. Rollefordeling

| | Hvem | Hvad |
|---|---|---|
| **Stemmen** | Rami | Taler til mikrofonen. Spiller lægen. Siger kun de replikker der står i manuskriptet. |
| **Fortælleren** | Magnus | Taler til dommerne. Har hånden på tastaturet. Griber ind hvis noget hænger. |

Én computer. Én browser. Ét vindue. Luk alt andet.

---

## 2. Generalprøve fredag kl. 9:00 (tag 20 minutter — spring den ikke over)

Kør hele afsnit 3 igennem én gang fra ende til anden. Det er ikke en formalitet:
appen henter billeder og lyd første gang og gemmer dem. Anden gang I kører,
er alt øjeblikkeligt. **Demoen kl. 14 skal være anden gang, ikke første.**

Tjek disse ni ting undervejs. Alle skal være i orden:

1. Siden åbner på `https://cosurg.com` og viser et spørgsmål.
2. **Sæt sproget til engelsk:** tryk på knappen der siger **Dansk** øverst. Den skifter til **English**, og teksterne bliver engelske.
3. Tryk på mikrofon-knappen. Browseren spørger om lov — tryk **Tillad / Allow**.
   Sig derefter noget. Jeres ord skal dukke op under **Transcript** i højre side.
4. Appen læser spørgsmålet højt. I skal kunne høre det. Skru op for computeren nu, ikke kl. 14.
5. Kør hele Del A igennem til der står **Recommendation**.
6. Tryk **Generate note**. Der går **omkring 15 sekunder**. Et notat skal komme frem.
7. Tryk **New assessment**, kør Del B, og se at det røde **RED FLAG**-felt kommer frem.
8. Skift træ til forbindingsvejledningen, slå **OR mode** til, og sig **"next"** tre gange.
   Skærmen skal skifte trin og vise billeder.
9. Find fallback-videoen på skrivebordet og afspil de første ti sekunder. Så ved I den virker.

Er der ét af de ni punkter der ikke virker: se afsnit 5, og skriv til Mads.
Han er væk, men kan svare på en besked.

**Fem minutter før I går på:** åbn siden på ny, sæt sproget til engelsk,
tryk mikrofonen til og sig ét ord for at vække den. Lad siden stå åben.
Rør den ikke igen før I går på scenen.

---

## 3. Manuskriptet — de fem minutter

Tiderne er vejledende. Er I bagud, springer I **Del B** over (den er markeret som
kan-undværes). Del A og Del C skal med.

### 0:00–0:35 — Åbningen (Magnus taler. Ingen rører computeren)

> "A patient with burns arrives in the emergency department. The doctor has to
> decide five things at once: how deep, how large, where, is the airway involved,
> is it circumferential. Under time pressure, steps get skipped. Not because the
> doctor doesn't know them — because nobody is asking.
>
> CoSurg asks. It is a clinical decision tree that talks. And the recommendation
> it gives comes from the tree, written by us as burn surgeons — never from a
> language model."

Peg på linjen nederst på skærmen: *"The recommendation comes from the clinical
tree — not from a language model."* Det er hele pointen. Sig den tidligt.

### 0:35–2:20 — Del A: Hele forløbet med stemmen (Rami taler til mikrofonen)

Magnus starter mikrofonen. Rami siger replikkerne. **Vent til appen har læst
spørgsmålet færdigt, før du svarer.** Der går 1–2 sekunder fra du er færdig med
at tale, til appen svarer. Det er normalt. Stå stille i de to sekunder.

| # | Appen spørger om | **Rami siger (engelsk)** | (dansk) |
|---|---|---|---|
| 1 | Skadesmekanisme | **"Scald."** | "Skoldning." |
| 2 | Inhalationsskade | **"No."** | "Nej." |
| 3 | Areal i procent | **"Eight percent."** | "Otte procent." |
| 4 | Dybde | **"Superficial dermal, blisters."** | "Overfladisk dermal, blærer." |
| 5 | Lokalisation | **"Other area, the forearm."** | "Andet område, underarmen." |
| 6 | Skyllet 20–30 min | **"Yes."** | "Ja." |

Magnus fortæller undervejs, mens træet fyldes ud i venstre side:

> "Every answer is spoken. Corti's speech-to-text hears it, and Corti's agent
> maps it onto the allowed answers for this exact node. If it can't tell which
> answer it is, it asks again — it never guesses. That is the whole safety
> argument."

Skærmen viser nu **Recommendation: Outpatient treatment — dress and follow up**.

Magnus peger på beslutningsvejen i venstre side:

> "There is the reasoning. Not a black box — six answers, and the path that led here."

**Tryk nu på `Generate note`.** Der går cirka 15 sekunder. **Tal imens:**

> "While that runs: the note is generated from the completed path and the
> transcript. And the diagnosis codes come from Corti's medical coding API — not
> invented by us."

Notatet kommer frem. Peg på **Plan**-afsnittet:

> "The plan is the tree's recommendation, word for word."

Er der koder på skærmen, peg på dem. **Er kodefeltet tomt, så sig ingenting om koder** og gå videre.

### 2:20–3:00 — Del B: Det røde flag *(kan springes over hvis I er bagud)*

Magnus trykker **New assessment**. Rami siger:

| # | **Rami siger (engelsk)** | (dansk) |
|---|---|---|
| 1 | **"Flame."** | "Flamme." |
| 2 | **"Yes — soot in the nose and a hoarse voice."** | "Ja — sod i næsen og hæs stemme." |

Det røde **RED FLAG**-felt slår ud med det samme og læses højt.

> "Suspected inhalation injury. The tree interrupts — out loud, regardless of
> voice mode — and escalates straight to the burn unit. Two answers. No one had
> to remember to ask."

*Virker replik 2 ikke, sig bare **"Yes."** Det giver samme røde flag.*

### 3:00–4:30 — Del C: OR-tilstand (klimaks — spring den ALDRIG over)

Magnus skifter træ: tryk **Switch tree** og vælg **"Forbinding: fingre, hænder og arme"**.

> "Same engine. Different content. The tree is data, not code — bites, frostbite,
> chemical injuries are a JSON file away."

Magnus trykker **OR mode**. Skærmen bliver mørk og skriften stor.

> "Now the surgeon is scrubbed. He cannot touch anything. The microphone is open,
> the instruction is read aloud, and the screen shows what to do — readable from
> two metres."

Rami siger, med en pause imellem hver:

1. **"Next."**
2. **"Next."**
3. **"Repeat."** ← appen læser trinnet igen
4. **"Next."**
5. **"Back."** ← appen går et trin tilbage

Appen kvitterer hørbart ("Got it.", "Repeating.", "Going one step back.") **før**
den rykker. Peg på det:

> "It answers before it moves, so the surgeon knows the command landed. And the
> commands are matched by rule, not by a model — so background conversation
> cannot trigger them, and they still work if the network drops."

### 4:30–5:00 — Afslutning (Magnus)

> "What you saw runs on four of Corti's five product areas: ambient speech-to-text,
> the agentic framework interpreting the answers, text generation for the note,
> and medical coding for the diagnosis codes.
>
> The clinical content is written by us — burn surgeons — and the trees are drafts
> pending our own sign-off. Next step is moving the trees onto an MCP server, so
> a hospital can maintain its own guidelines centrally and every app reads the same
> truth. Thank you."

---

## 4. Svar på de spørgsmål I får (2 minutter)

**"Hvordan ved I at fortolkningen er rigtig?"**
> "Every node has a closed set of allowed answers. The agent maps onto one of them
> or flags it as unclear and asks again. It is never allowed to invent a value.
> And the recommendation itself is not interpreted at all — it is the tree."

**"Hvad hvis modellen tager fejl?"**
> "Then it asks again. The failure mode is a repeated question, not a wrong
> recommendation. The recommendation is deterministic — the same path always
> gives the same answer."

**"Hvem har skrevet det kliniske indhold?"**
> "We did. The burn tree is derived from brandsaar.dk, the Danish Burn Society's
> guidelines. The dressing guide is from Rigshospitalet's burn unit, section 6052.
> Both are marked as drafts pending clinical sign-off — we are not shipping
> unreviewed clinical content."

**"Er det ikke bare endnu en scribe?"**
> "A scribe writes down what happened. This changes what happens — it asks the
> question the doctor didn't get to."

**"Hvad med baggrundsstøj i operationsstuen?"**
> "Known limitation. The commands are matched conservatively: five words maximum,
> exact phrases only. A wake word is on the roadmap."

---

## 5. HVIS DET GÅR GALT

Ro på. Der er en vej videre i alle tilfældene. **Bliv aldrig stående og vent.**

### A. Mikrofonen virker ikke — der står "Permission denied" eller lignende i et rødt felt

1. Tryk på **hængelåsen** til venstre for adressen øverst i browseren.
2. Sæt **Mikrofon** til **Tillad**.
3. Tryk **F5** for at genindlæse siden. Start forfra på delen.

Virker det stadig ikke: **brug skrivefeltet i stedet.** Under spørgsmålet står
*"Type or say your answer…"*. Magnus skriver svaret og trykker Enter. Sig til
dommerne: *"I'll type it — same path through the engine."* Det er ikke en fejl,
det er den anden vej ind.

### B. Der står "Interpreting…" og der sker ikke mere

Nettet er væk. **Appen kommer ikke videre af sig selv — vent ikke.**

1. Tryk i stedet på **svarknappen** på skærmen (fx `Scald`). Den virker uden net.
2. Hjælper det ikke: tryk **F5**. Siden starter forfra på spørgsmål 1.
3. Er nettet helt væk: spring til punkt G (videoen).

### C. Appen forstår ikke svaret og spørger igen

Helt normalt og faktisk en pointe. Sig til dommerne:
*"There — it wasn't sure, so it asked again instead of guessing."*
Sig så bare **ét ord**: `"Scald."`, `"No."`, `"Yes."`. Ikke en hel sætning.

### D. Der kommer ingen lyd

Skru op. Tjek at lyden ikke er sat til et andet output (hovedtelefoner, projektor).
Lyder stemmen pludselig mere robotagtig end i går: det er den indbyggede
browserstemme der er trådt til fordi den gode stemme ikke kunne nås. **Fortsæt —
alt virker.** Nævn det ikke.

### E. OR-tilstand: I siger "next", men der sker ingenting

Magnus trykker på **mellemrumstasten**. Det gør præcis det samme som "next".
Højrepil = næste. Venstrepil = tilbage. **R** = gentag.
Sig til dommerne: *"My colleague is not scrubbed — so he can press."*

### F. Det røde felt vil ikke forsvinde

Sig **"OK."** Eller tryk på **OK**-knappen. Eller tryk mellemrum.

### G. Siden er hvid, eller intet virker

1. **F5.**
2. Virker det ikke: luk browseren, åbn den igen, gå til adressen.
3. Virker det stadig ikke: **åbn fallback-videoen fra skrivebordet og afspil den.**
   Sig: *"Our venue connection is down — here is the same flow recorded this
   morning."* Bliv ved med at fortælle henover videoen præcis som i manuskriptet.
   **Det er et fuldgyldigt alternativ. Dommerne har set det før.**

### H. Wifi'et på stedet er dødt

Del internet fra en telefon (personligt hotspot) og forbind computeren til det.
Virker det ikke: punkt G.

---

## 6. Huskesedlen — riv den ud

```
URL      cosurg.com
Sprog    Tryk "Dansk" → bliver til "English"

DEL A    Scald. / No. / Eight percent. /
         Superficial dermal, blisters. /
         Other area, the forearm. / Yes.
         → Generate note  (15 sek — TAL imens)

DEL B    New assessment
         Flame. / Yes — soot in the nose and a hoarse voice.
         → RED FLAG

DEL C    Switch tree → Forbinding: fingre, hænder og arme
         OR mode
         Next. / Next. / Repeat. / Next. / Back.

HÆNGER   "Interpreting…" står fast  → tryk på svarknappen, ellers F5
MIKROFON virker ikke                → skriv svaret i tekstfeltet
"NEXT"   virker ikke i OR-tilstand   → tryk MELLEMRUM
ALT      er gået i stykker           → afspil videoen fra skrivebordet
```

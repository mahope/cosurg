# DEMO — CoSurg, Friday 14:00–15:30

**For Magnus and Rami. You are running this on your own. Mads leaves at 11:00.**

Five minutes of demo plus two minutes of questions.
Read sections 1 and 2 through once. Finish the rehearsal in section 2 before you do
anything else. If something goes wrong during the demo: section 5. It says exactly
what to do.

**URL:** `https://cosurg.com`
**Language during the demo: English.** The app speaks and listens in English. Every
line spoken into the microphone is written out below in English — say them exactly as
written. If you switch to Danish instead, the Danish lines are given in brackets.

> **A note on language in this file.** The instructions are in English, like the rest
> of this repository. The emergency procedure and the tear-off crib sheet are repeated
> in Danish at the end (section 7), because those are the two parts you read under
> pressure.

---

## 1. Who does what

| | Who | What |
|---|---|---|
| **The voice** | Rami | Speaks into the microphone. Plays the clinician. Says only the lines in the script. |
| **The narrator** | Magnus | Speaks to the judges. Hands on the keyboard. Steps in if anything hangs. |

One computer. One browser. One window. Close everything else.

---

## 2. Rehearsal Friday at 09:00 (allow 20 minutes — do not skip it)

Run all of section 3 end to end once. This is not a formality: the app fetches images
and audio the first time and caches them. The second run is instant. **The 14:00 demo
must be the second run, not the first.**

Check these nine things as you go. All of them must be in order:

1. The page opens at `https://cosurg.com` and shows a question.
2. **Set the language to English:** press the button at the top that says **Dansk**. It
   switches to **English**, and the texts become English.
3. Press the microphone button. The browser asks for permission — press **Tillad /
   Allow**. Then say something. Your words must appear under **Transcript** on the
   right.
4. The app reads the question aloud. You must be able to hear it. Turn the volume up
   now, not at 14:00.
5. Run all of Part A through until **Recommendation** appears.
6. Press **Generate note**. It takes **about 15 seconds**. A note must appear.
7. Press **New assessment**, run Part B, and check that the red **RED FLAG** panel
   appears.
8. Switch to the dressing guide tree, turn on **OR mode**, and say **"next"** three
   times. The screen must change step and show images.

If any one of the nine does not work: see section 5, and message Mads. He has left, but
he can answer a message.

**Five minutes before you go on:** reopen the page, set the language to English, turn
the microphone on and say one word to wake it. Leave the page open. Do not touch it
again before you go on stage.

---

## 3. The script — the five minutes

The timings are approximate. If you are running late, skip **Part B** (it is marked as
expendable). Parts A and C must be included.

### 0:00–0:35 — The opening (Magnus speaks. Nobody touches the computer)

> "A patient with burns arrives in the emergency department. The doctor has to
> decide five things at once: how deep, how large, where, is the airway involved,
> is it circumferential. Under time pressure, steps get skipped. Not because the
> doctor doesn't know them — because nobody is asking.
>
> CoSurg asks. It is a clinical decision tree that talks. And the recommendation
> it gives comes from the tree, written by us as burn surgeons — never from a
> language model."

Point at the line at the bottom of the screen: *"The recommendation comes from the
clinical tree — not from a language model."* That is the whole point. Say it early.

### 0:35–2:20 — Part A: the full pathway by voice (Rami speaks into the microphone)

Magnus starts the microphone. Rami says the lines. **Wait until the app has finished
reading the question before you answer.** There is a 1–2 second gap between you
finishing and the app responding. That is normal. Stand still for those two seconds.

| # | The app asks about | **Rami says (English)** | (Danish) |
|---|---|---|---|
| 1 | Injury mechanism | **"Scald."** | "Skoldning." |
| 2 | Inhalation injury | **"No."** | "Nej." |
| 3 | Area in per cent | **"Eight percent."** | "Otte procent." |
| 4 | Depth | **"Superficial dermal, blisters."** | "Overfladisk dermal, blærer." |
| 5 | Location | **"Other area, the forearm."** | "Andet område, underarmen." |
| 6 | Cooled for 20–30 min | **"Yes."** | "Ja." |

Magnus narrates while the tree fills in on the left:

> "Every answer is spoken. Corti's speech-to-text hears it, and Corti's agent
> maps it onto the allowed answers for this exact node. If it can't tell which
> answer it is, it asks again — it never guesses. That is the whole safety
> argument."

The screen now shows **Recommendation: Outpatient treatment — dress and follow up**.

Magnus points at the decision path on the left:

> "There is the reasoning. Not a black box — six answers, and the path that led here."

**Now press `Generate note`.** It takes about 15 seconds. **Talk while it runs:**

> "While that runs: the note is generated from the completed path and the
> transcript. And the diagnosis codes come from Corti's medical coding API — not
> invented by us."

The note appears. Point at the **Plan** section:

> "The plan is the tree's recommendation, word for word."

If codes are on screen, point at them. **If the code field is empty, say nothing about
codes** and move on.

### 2:20–3:00 — Part B: the red flag *(skippable if you are running late)*

Magnus presses **New assessment**. Rami says:

| # | **Rami says (English)** | (Danish) |
|---|---|---|
| 1 | **"Flame."** | "Flamme." |
| 2 | **"Yes — soot in the nose and a hoarse voice."** | "Ja — sod i næsen og hæs stemme." |

The red **RED FLAG** panel fires immediately and is read aloud.

> "Suspected inhalation injury. The tree interrupts — out loud, regardless of
> voice mode — and escalates straight to the burn unit. Two answers. No one had
> to remember to ask."

*If line 2 does not work, just say **"Yes."** It gives the same red flag.*

### 3:00–4:30 — Part C: OR mode (the climax — NEVER skip this)

Magnus switches tree: press **Switch tree** and choose **"Forbinding: fingre, hænder og
arme"**.

> "Same engine. Different content. The tree is data, not code — bites, frostbite,
> chemical injuries are a JSON file away."

Magnus presses **OR mode**. The screen goes dark and the type goes large.

> "Now the surgeon is scrubbed. He cannot touch anything. The microphone is open,
> the instruction is read aloud, and the screen shows what to do — readable from
> two metres."

Rami says, with a pause between each:

1. **"Next."**
2. **"Next."**
3. **"Repeat."** ← the app reads the step again
4. **"Next."**
5. **"Back."** ← the app goes one step back

The app acknowledges audibly ("Got it.", "Repeating.", "Going one step back.") **before**
it moves. Point that out:

> "It answers before it moves, so the surgeon knows the command landed. And the
> commands are matched by rule, not by a model — so background conversation
> cannot trigger them, and they still work if the network drops."

### 4:30–5:00 — The close (Magnus)

> "What you saw runs on all five of Corti's product areas — four of them on this
> screen: ambient speech-to-text, the agentic framework interpreting the answers,
> text generation for the note, and medical coding for the diagnosis codes. The
> fifth, dictation, appends the clinician's own additions to the note.
>
> The clinical content is written by us — burn surgeons — and every tree carries its
> named clinical sources: the Danish Burn Association and Rigshospitalet's national
> burn service. The knowledge behind the answers already lives on our own MCP server,
> attached to Corti's agentic framework, so a hospital can maintain its guidelines in
> one place and every app reads the same truth. Thank you."

---

## 4. Answers to the questions you will get (2 minutes)

**"How do you know the interpretation is right?"**
> "Every node has a closed set of allowed answers. The agent maps onto one of them
> or flags it as unclear and asks again. It is never allowed to invent a value.
> And the recommendation itself is not interpreted at all — it is the tree."

**"What if the model is wrong?"**
> "Then it asks again. The failure mode is a repeated question, not a wrong
> recommendation. The recommendation is deterministic — the same path always
> gives the same answer."

**"Who wrote the clinical content?"**
> "We did. The burn tree is derived from brandsaar.dk, the Danish Burn Association's
> guidelines, written by Rami. The dressing guide is from Rigshospitalet's burn unit,
> section 6052 — the national referral centre for burns — brought in by Magnus. Every
> tree carries its sources and its named authors in the file itself."

**"Isn't this just another scribe?"**
> "A scribe writes down what happened. This changes what happens — it asks the
> question the doctor didn't get to."

**"What about background noise in the operating theatre?"**
> "Known limitation. The commands are matched conservatively: five words maximum,
> exact phrases only. A wake word is on the roadmap."

---

## 5. IF IT GOES WRONG

Stay calm. There is a way forward in every case. **Never just stand there and wait.**

### A. The microphone does not work — a red panel says "Permission denied" or similar

1. Press the **padlock** to the left of the address at the top of the browser.
2. Set **Microphone** to **Allow**.
3. Press **F5** to reload the page. Start that part over.

If it still does not work: **use the text field instead.** Under the question it says
*"Type or say your answer…"*. Magnus types the answer and presses Enter. Tell the
judges: *"I'll type it — same path through the engine."* This is not a failure, it is
the other way in.

### B. It says "Interpreting…" and nothing more happens

The network is gone. **The app will not recover on its own — do not wait.**

1. Press the **answer button** on screen instead (e.g. `Scald`). It works without a
   network.
2. If that does not help: press **F5**. The page restarts at question 1.
3. If the network is completely gone: skip to point G (the video).

### C. The app does not understand the answer and asks again

Completely normal, and in fact the point. Tell the judges:
*"There — it wasn't sure, so it asked again instead of guessing."*
Then say just **one word**: `"Scald."`, `"No."`, `"Yes."`. Not a whole sentence.

### D. There is no sound

Turn the volume up. Check that audio is not routed to another output (headphones,
projector). If the voice suddenly sounds more robotic than yesterday: that is the
built-in browser voice stepping in because the good voice could not be reached.
**Carry on — everything works.** Do not mention it.

### E. OR mode: you say "next" and nothing happens

Magnus presses the **space bar**. It does exactly the same as "next".
Right arrow = next. Left arrow = back. **R** = repeat.
Tell the judges: *"My colleague is not scrubbed — so he can press."*

### F. The red panel will not go away

Say **"OK."** Or press the **OK** button. Or press space.

### G. The page is blank, or nothing works

1. **F5.**
2. If that fails: close the browser, open it again, go to the address.
3. If it still fails: **tell the story instead of showing it.** Say: *"Our
   connection is down, so let me tell you what you would have seen — and I am
   happy to show it to you right after."* Then walk through the clinical problem
   and how CoSurg answers it, using the printed script. A judge who understands
   the idea will remember it; a demo nobody could follow is worth less than a
   clear explanation.

### H. The venue wifi is dead

Share internet from a phone (personal hotspot) and connect the computer to it.
If that fails: point G.

---

## 6. The crib sheet — tear it off

```
URL       cosurg.com
Language  Press "Dansk" → becomes "English"

PART A    Scald. / No. / Eight percent. /
          Superficial dermal, blisters. /
          Other area, the forearm. / Yes.
          → Generate note  (15 sec — TALK while it runs)

PART B    New assessment
          Flame. / Yes — soot in the nose and a hoarse voice.
          → RED FLAG

PART C    Switch tree → Forbinding: fingre, hænder og arme
          OR mode
          Next. / Next. / Repeat. / Next. / Back.

HANGING   "Interpreting…" is stuck   → press the answer button, else F5
MICROPHONE not working               → type the answer in the text field
"NEXT"    not working in OR mode     → press SPACE
EVERYTHING broken                    → play the video from the desktop
```

---
---

## 7. Nødplan og huskeseddel — på dansk

*(Afsnit 5 og 6 på dansk. Det er dem I læser under pres.)*

### Hvis det går galt

Ro på. Der er en vej videre i alle tilfældene. **Bliv aldrig stående og vent.**

**A. Mikrofonen virker ikke — der står "Permission denied" eller lignende i et rødt felt**
1. Tryk på **hængelåsen** til venstre for adressen øverst i browseren.
2. Sæt **Mikrofon** til **Tillad**.
3. Tryk **F5** for at genindlæse siden. Start forfra på delen.

Virker det stadig ikke: **brug skrivefeltet i stedet.** Under spørgsmålet står
*"Type or say your answer…"*. Magnus skriver svaret og trykker Enter. Sig til
dommerne: *"I'll type it — same path through the engine."* Det er ikke en fejl,
det er den anden vej ind.

**B. Der står "Interpreting…" og der sker ikke mere**
Nettet er væk. **Appen kommer ikke videre af sig selv — vent ikke.**
1. Tryk i stedet på **svarknappen** på skærmen (fx `Scald`). Den virker uden net.
2. Hjælper det ikke: tryk **F5**. Siden starter forfra på spørgsmål 1.
3. Er nettet helt væk: spring til punkt G.

**C. Appen forstår ikke svaret og spørger igen**
Helt normalt og faktisk en pointe. Sig til dommerne:
*"There — it wasn't sure, so it asked again instead of guessing."*
Sig så bare **ét ord**: `"Scald."`, `"No."`, `"Yes."`. Ikke en hel sætning.

**D. Der kommer ingen lyd**
Skru op. Tjek at lyden ikke er sat til et andet output (hovedtelefoner, projektor).
Lyder stemmen pludselig mere robotagtig end i går: det er den indbyggede
browserstemme der er trådt til fordi den gode stemme ikke kunne nås. **Fortsæt —
alt virker.** Nævn det ikke.

**E. OR-tilstand: I siger "next", men der sker ingenting**
Magnus trykker på **mellemrumstasten**. Det gør præcis det samme som "next".
Højrepil = næste. Venstrepil = tilbage. **R** = gentag.
Sig til dommerne: *"My colleague is not scrubbed — so he can press."*

**F. Det røde felt vil ikke forsvinde**
Sig **"OK."** Eller tryk på **OK**-knappen. Eller tryk mellemrum.

**G. Siden er hvid, eller intet virker**
1. **F5.**
2. Virker det ikke: luk browseren, åbn den igen, gå til adressen.
3. Virker det stadig ikke: **fortæl det i stedet for at vise det.** Sig: *"Our
   connection is down, so let me tell you what you would have seen — and I am
   happy to show it to you right after."* Gennemgå så det kliniske problem og
   hvordan CoSurg løser det, ud fra det trykte manuskript. En dommer der forstår
   idéen husker den; en demo ingen kunne følge er mindre værd end en klar
   forklaring.

**H. Wifi'et på stedet er dødt**
Del internet fra en telefon (personligt hotspot) og forbind computeren til det.
Virker det ikke: punkt G.

### Huskesedlen — riv den ud

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

HÆNGER   "Interpreting…" står fast   → tryk på svarknappen, ellers F5
MIKROFON virker ikke                 → skriv svaret i tekstfeltet
"NEXT"   virker ikke i OR-tilstand   → tryk MELLEMRUM
ALT      er gået i stykker           → fortæl historien fra manuskriptet
```

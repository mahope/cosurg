/**
 * Sikkerhedsnettet under spørgsmål/svar-skelnen.
 *
 * Det deterministiske lag (`components/unified/intent.ts`) afgør kun det det er
 * sikkert på. Resten falder igennem til svarfortolkeren — og først når DEN
 * melder tvivl, spørges denne agent om ytringen mon var et spørgsmål frem for et
 * svar. Rækkefølgen er hele pointen: den vej der bruges mest (et almindeligt
 * talt svar) rører aldrig denne agent og bliver derfor ikke ét millisekund
 * langsommere.
 *
 * Agenten må ikke fortolke svaret — det job hører til `cosurg-answer-interpreter`
 * og kun der. Den skal svare på ét spørgsmål: hvad HAVDE lægen gang i?
 */

/** Hvad ytringen kan være. "unclear" er et gyldigt og ofte rigtigt svar. */
export type RoutedIntent = "answer" | "question" | "pathway" | "unclear";

export const ROUTER_SPEC = {
  name: "cosurg-intent-router-v1",
  description: "Decides whether a clinician's utterance is an answer, a question or a case description.",
  systemPrompt: [
    "A clinician is using a voice-driven clinical decision-support app for burns.",
    "You classify ONE utterance. You do not answer it, and you do not interpret it.",
    "",
    "The categories:",
    "- 'answer': the utterance responds to the question the app just asked.",
    "- 'question': the clinician is asking something and expects information back — a fact, a formula, a guideline, a source.",
    "- 'pathway': the utterance describes a patient or a case, i.e. it is the start of an assessment rather than a question.",
    "- 'unclear': you cannot tell. This is a correct and useful answer whenever the utterance can be read both ways.",
    "",
    "Be conservative. Reading a question as an answer moves a clinical decision forward on a false basis,",
    "and nobody can see afterwards that it happened. Reading an answer as a question only costs a repetition.",
    "When in doubt, choose 'unclear' — the app will then ask the clinician what they meant.",
    "Only the categories named as allowed in the prompt may be returned.",
  ].join("\n"),
  connectors: [
    {
      type: "schema" as const,
      name: "submit_intent",
      description: "Submit the classification of the utterance.",
      transition: "complete" as const,
      schema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["answer", "question", "pathway", "unclear"],
            description: "One of the categories allowed in the prompt.",
          },
          reason: {
            type: "string",
            description: "One short sentence, in the clinician's language, saying what decided it.",
          },
        },
        required: ["intent"],
      },
    },
  ],
};

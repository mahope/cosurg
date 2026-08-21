"use client";

/**
 * BILLEDER DER FØLGER MED SPØRGSMÅLET.
 *
 * En læge der står med et sår tager et foto af det. Han skal kunne sende det
 * med sit spørgsmål i stedet for at skulle beskrive farve, afgrænsning og
 * fugtighed i ord — beskrivelsen er netop det han er usikker på.
 *
 * Filen læses til base64 i browseren og rejser med i den samme POST som
 * spørgsmålet. Der er ingen upload-runde, ingen midlertidig lagring og intet
 * billede der bliver liggende noget sted: billedet findes i hukommelsen indtil
 * spørgsmålet er sendt, og forsvinder derefter med sessionen. Det er en
 * bevidst beslutning og ikke en forenkling — et klinisk foto må ikke ende i et
 * blob-lager vi ikke har lovet noget om.
 */

/** Loftet er sat af hvad et POST-kald kan bære, ikke af hvad en læge har lyst til. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES = 4;

/** Det API'et modtager: rå base64 uden `data:`-præfiks, plus dens type. */
export interface ChatImage {
  /** MIME-type, fx "image/jpeg". Modellen skal vide hvad den ser på. */
  mediaType: string;
  /** Base64 UDEN "data:image/jpeg;base64,"-præfikset. */
  data: string;
  /** Filnavnet, hvis browseren gav os et. Kun til visning. */
  name?: string;
}

/** Det UI'et holder på: billedet selv plus en visningsklar kopi. */
export interface Attachment extends ChatImage {
  id: string;
  /** Fuld data-URL — kun til miniaturen. Den sendes aldrig. */
  previewUrl: string;
  bytes: number;
}

export type AttachError =
  | "intakeImageTooLarge"
  | "intakeImageTooMany"
  | "intakeImageNotAnImage"
  | "intakeImageUnreadable";

/**
 * Læs én fil til en vedhæftning.
 *
 * Fejlene er nøgler og ikke sætninger: beskeden skal kunne vises på begge sprog
 * uden at denne fil skal vide hvilket sprog der er valgt.
 */
export async function readAttachment(file: File): Promise<Attachment | AttachError> {
  if (!file.type.startsWith("image/")) return "intakeImageNotAnImage";
  if (file.size > MAX_IMAGE_BYTES) return "intakeImageTooLarge";

  const dataUrl = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

  if (!dataUrl) return "intakeImageUnreadable";
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return "intakeImageUnreadable";

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mediaType: file.type,
    data: dataUrl.slice(comma + 1),
    name: file.name || undefined,
    previewUrl: dataUrl,
    bytes: file.size,
  };
}

/** Skræl visningsdelen af, så kun det API'et skal bruge bliver sendt. */
export function toChatImages(attachments: Attachment[]): ChatImage[] {
  return attachments.map(({ mediaType, data, name }) => ({ mediaType, data, name }));
}

/* ------------------------------------------------------------------ *
 * Miniaturen der bliver i tråden
 * ------------------------------------------------------------------ */

/**
 * Fotoet skal kunne SES bagefter.
 *
 * Et spørgsmål med et billede er halvt uforståeligt uden billedet — "hvad ser
 * du her?" giver ingen mening ved siden af et svar, hvis fotoet forsvandt i
 * det sekund det blev sendt. Men det fulde foto er 1-8 MB base64, og fire af
 * dem i en samtale ville fylde hukommelsen med data ingen kigger på i fuld
 * opløsning.
 *
 * Derfor gemmes en NEDSKALERET kopi til visning. 320 px er nok til en
 * miniature og til lysbordet på en telefon, og JPEG q0.72 bringer en typisk
 * sårfoto ned i størrelsesordenen 15-25 kB — tre størrelsesordner mindre.
 */
const PREVIEW_MAX_PX = 320;
const PREVIEW_QUALITY = 0.72;

/** Miniaturen som tråden holder på: en data-URL, ikke det fulde billede. */
export interface TurnImage {
  url: string;
  name?: string;
}

/**
 * Nedskalér ét billede til en miniature.
 *
 * Kan browseren ikke tegne det (manglende canvas-kontekst, korrupt fil),
 * returneres null — en manglende miniature må aldrig vælte turen.
 */
export function makePreview(image: ChatImage): Promise<TurnImage | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    const img = new window.Image();
    img.onload = () => {
      try {
        const skala = Math.min(1, PREVIEW_MAX_PX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * skala));
        const h = Math.max(1, Math.round(img.height * skala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ url: canvas.toDataURL("image/jpeg", PREVIEW_QUALITY), name: image.name });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = `data:${image.mediaType};base64,${image.data}`;
  });
}

/** Miniaturer for en hel vedhæftning, parallelt. Dem der fejler falder bort. */
export async function makePreviews(images: ChatImage[]): Promise<TurnImage[]> {
  const alle = await Promise.all(images.map(makePreview));
  return alle.filter((p): p is TurnImage => p !== null);
}

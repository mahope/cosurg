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

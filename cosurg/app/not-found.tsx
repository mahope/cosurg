import type { Metadata } from "next";
import { Bilingual, MessagePage, PrimaryAction } from "@/components/ui/MessagePage";
import { both } from "@/components/ui/uiText";

export const metadata: Metadata = {
  title: both("notFoundTitle").da,
  robots: { index: false, follow: false },
};

/**
 * Død URL.
 *
 * Uden denne fil får den der klikker forkert Next.js' standardside — sort
 * Helvetica på hvidt, i et andet designsprog end resten. Det er præcis det
 * øjeblik hvor en dommer holder op med at tro på at appen er et produkt.
 */
export default function NotFound() {
  return (
    <MessagePage badge={both("notFoundCode").da} titleKey="notFoundTitle" bodyKey="notFoundBody">
      <PrimaryAction href="/">
        <Bilingual k="goHome" />
      </PrimaryAction>
    </MessagePage>
  );
}

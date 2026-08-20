import type { Metadata } from "next";
import { ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = {
  title: "CoSurg — klinisk chat",
  description:
    "Stil et frit klinisk spørgsmål om brandsår og få et svar med de kilder det hviler på. Drevet af Cortis registry-eksperter.",
};

export default function ChatPage() {
  return <ChatView />;
}

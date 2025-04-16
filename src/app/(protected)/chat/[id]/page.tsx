import { Metadata } from "next";
import ChatComponent from "@/components/chat/chat-component";

export const metadata: Metadata = {
  title: "Chat | Serenity AI",
  description: "Chat with Serenity AI to improve your mental well-being.",
};

export default function ChatPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return <ChatComponent initialChatId={id} />;
} 
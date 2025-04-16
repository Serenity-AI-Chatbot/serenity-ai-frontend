import { Metadata } from "next";
import ChatComponent from "@/components/chat/chat-component";

export const metadata: Metadata = {
  title: "Chat | Serenity AI",
  description: "Chat with Serenity AI to improve your mental well-being.",
};

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;
  return <ChatComponent initialChatId={chatId} />;
} 
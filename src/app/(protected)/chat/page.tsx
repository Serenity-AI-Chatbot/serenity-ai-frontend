import type { Metadata } from "next"
import ChatComponent from "@/components/chat/chat-component"

export const metadata: Metadata = {
  title: "MindfulAI Chatbot",
  description: "Chat with our empathetic AI for emotional support",
}

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <ChatComponent />
    </div>
  )
}


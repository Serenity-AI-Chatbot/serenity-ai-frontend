import type { Metadata } from "next"
import ChatComponent from "@/components/chat/chat-component"

export const metadata: Metadata = {
  title: "MindfulAI Chatbot",
  description: "Chat with our empathetic AI for emotional support",
}

export default function ChatPage() {
  return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 text-center">Serenity AI</h1>
        <p className="text-center mb-8">Chat with our AI for emotional support and guidance</p>
        <ChatComponent />
      </div>
  )
}


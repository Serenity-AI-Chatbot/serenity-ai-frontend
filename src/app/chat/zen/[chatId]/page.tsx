import ZenChat from "@/components/chat/zen-chat";

interface PageProps {
  params: {
    chatId: string;
  };
}

export default function ZenModePage({ params }: PageProps) {
  return <ZenChat chatId={params.chatId} />;
} 
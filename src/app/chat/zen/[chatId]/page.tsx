import ZenChat from "@/components/chat/zen-chat";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ZenModePage({ params }: PageProps) {
  const { chatId } = await params;
  return <ZenChat chatId={chatId} />;
} 
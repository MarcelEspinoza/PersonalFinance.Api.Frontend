import { PageHeader } from "../../components/PageHeader";
import { useHideGlobalChat, useSharedGlobalChat } from "../../contexts/globalChatContext";
import { ChatThread } from "../../components/Chat/ChatThread";

export function AssistantPage() {
  // Same conversation as the docked assistant, which hides here so it isn't shown twice.
  const chat = useSharedGlobalChat();
  useHideGlobalChat();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-6">
      <PageHeader
        title="Asistente"
        description="Consulta toda tu información, prepara cambios en movimientos, categorías, presupuestos, préstamos, Pasanaco e importaciones, y crea recordatorios. Tú confirmas cada acción."
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <ChatThread chat={chat} />
      </div>
    </div>
  );
}

export default AssistantPage;

import { PageHeader } from "../../components/PageHeader";
import { useGlobalChat } from "../../hooks/useGlobalChat";
import { ChatThread } from "../../components/Chat/ChatThread";

export function AssistantPage() {
  const chat = useGlobalChat();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-6">
      <PageHeader
        title="Asistente"
        description="Pregunta, busca o pide consejo sobre cualquier módulo: gastos, presupuestos, préstamos, ahorro, pasanaco o cuentas."
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <ChatThread chat={chat} />
      </div>
    </div>
  );
}

export default AssistantPage;

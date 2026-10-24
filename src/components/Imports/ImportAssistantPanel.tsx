import type { ReactNode } from "react";
import { AssistantPanel } from "../Chat/AssistantPanel";
import { useHideGlobalChat } from "../../contexts/globalChatContext";
import type { ImportChatMessage } from "../../types/ledger";

interface ImportAssistantPanelProps {
  messages: ImportChatMessage[];
  busy: boolean;
  /** The batch is already applied: the conversation stays readable but nothing can be sent. */
  disabled: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  /** Extra content under a message, e.g. the proposed changes waiting for confirmation. */
  renderMessageExtras?: (index: number) => ReactNode;
  inputRef: { current: HTMLTextAreaElement | null };
  /** Small screens only: the bottom sheet is collapsed to a slim bar. */
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
}

/**
 * Import assistant, docked next to the movements. While it is on screen the global assistant hides,
 * so only one chat shows at a time.
 */
export function ImportAssistantPanel(props: ImportAssistantPanelProps) {
  useHideGlobalChat();

  return (
    <AssistantPanel
      {...props}
      title="Asistente de importación"
      disabledPlaceholder="El lote ya está aplicado."
      emptyState={
        <>
          <p>
            Puedes seguir revisando los movimientos mientras hablamos. Pídeme cosas como «pon Mercadona en
            Alimentación», «descuenta estos pagos del previsto de Viajes» o «¿por qué no cuadra el saldo?».
          </p>
          <p>
            Yo te propongo los cambios y tú decides si los confirmas. Para preguntar por un movimiento o un aviso
            concreto, pulsa su icono de mensaje.
          </p>
        </>
      }
    />
  );
}

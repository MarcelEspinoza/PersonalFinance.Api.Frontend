import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  failed: boolean;
}

/** Si la guía falla, se oculta sin romper el resto de la app. */
export class TourErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[guía] Error en el recorrido; se oculta para no afectar a la app.", error, info.componentStack);
    try {
      this.props.onError?.(error);
    } catch {
      // Nunca dejamos que la guía rompa la app.
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

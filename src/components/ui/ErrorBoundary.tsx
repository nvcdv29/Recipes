import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface">
          <AlertTriangle size={64} className="text-red-500 mb-6" />
          <h1 className="text-3xl font-serif font-bold mb-4">Etwas ist schiefgelaufen.</h1>
          <p className="text-on-surface-variant mb-4 max-w-md">
            Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
          </p>
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm mb-8 max-w-lg overflow-auto">
            {/* Find out what the actual error was */}
            <p className="font-mono text-left">{(this.state as any).error?.message || "Unbekannter Fehler"}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

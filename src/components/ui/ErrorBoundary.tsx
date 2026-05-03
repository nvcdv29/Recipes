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

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
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
          <p className="text-on-surface-variant mb-8 max-w-md">
            Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
          </p>
          <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

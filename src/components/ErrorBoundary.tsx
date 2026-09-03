import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Errore non gestito:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Errore sconosciuto";
      const errorStack = this.state.error?.stack || "";
      const componentStack = this.state.errorInfo?.componentStack || "";

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg border border-rose-200 overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-200 p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h1 className="text-base font-black text-rose-900">Si e verificato un errore imprevisto</h1>
                <p className="text-xs text-rose-600 font-medium mt-0.5">
                  Fai uno screenshot di questa pagina e mandala all'amministratore per diagnosticare il problema.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Messaggio di errore</p>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <code className="text-sm font-mono text-rose-800 break-all">{errorMessage}</code>
                </div>
              </div>

              {errorStack && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stack Trace</p>
                  <div className="bg-slate-900 rounded-xl p-3 overflow-auto max-h-48">
                    <code className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all">
                      {errorStack}
                    </code>
                  </div>
                </div>
              )}

              {componentStack && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Componente React coinvolto</p>
                  <div className="bg-slate-900 rounded-xl p-3 overflow-auto max-h-32">
                    <code className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all">
                      {componentStack}
                    </code>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Ricarica la pagina
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Riprova senza ricaricare
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
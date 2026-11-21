import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class FirestoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let display = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed.error && parsed.operationType) {
        display = `Firestore ${parsed.operationType} on ${parsed.path || 'database'}: ${parsed.error}`;
      }
    } catch {
      // Standard error string
    }
    return { hasError: true, message: display };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/35">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-600 dark:text-rose-400" />
          <h2 className="mt-3 text-lg font-bold text-[#071426] dark:text-white">
            Unable to complete data operation
          </h2>
          <p className="mt-2 break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.reload();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2878FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f63d6]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload Page</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

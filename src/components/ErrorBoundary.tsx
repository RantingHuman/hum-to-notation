import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <div className="bg-surface border border-danger rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="text-5xl">💥</div>
            <h1 className="font-display text-ink text-xl font-semibold">Something went wrong</h1>
            <p className="text-ink-muted text-sm">
              An unexpected error occurred. Your projects are safely stored in your browser.
            </p>
            {this.state.message && (
              <p className="text-danger text-xs font-mono bg-canvas rounded px-3 py-2 break-all">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary-strong text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

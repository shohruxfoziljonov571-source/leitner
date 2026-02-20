import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches render errors from child components and shows
 * a user-friendly fallback instead of crashing the entire app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in dev; replace with Sentry/analytics in production
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Xatolik yuz berdi
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Sahifani yuklashda muammo chiqdi. Qayta urinib ko'ring.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline">
              Qayta urinish
            </Button>
            <Button onClick={() => window.location.reload()}>
              Sahifani yangilash
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 text-left text-xs text-destructive bg-destructive/10 rounded-lg p-4 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

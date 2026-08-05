import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Without this, an uncaught error anywhere in the tree (e.g. a component
 * calling .toFixed() on a value that turned out to be undefined) unmounts
 * the entire app — React clears the DOM on render failure and nothing here
 * previously caught it, so the page just goes blank with no explanation.
 * This wraps the whole app once, at the top, so a bad page shows a
 * recoverable message instead of taking the whole voyage down.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error rendering the app:', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.href = '/home';
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl text-gold">The ship hit a reef.</h1>
          <p className="max-w-md text-foam/70">
            Something went wrong loading this page. This is usually caused by stale saved data.
          </p>
          <button onClick={this.handleReload} className="btn-gold">
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

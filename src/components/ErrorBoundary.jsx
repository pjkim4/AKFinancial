import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical Component Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-danger/10 border border-danger/20 rounded-2xl m-4 text-center">
          <h2 className="text-danger font-black text-xl mb-4 uppercase">Something went wrong</h2>
          <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
            A component has encountered a critical error. The details have been logged to the console.
          </p>
          <pre className="bg-black/40 p-4 rounded-xl text-[10px] text-danger text-left overflow-auto max-h-40">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-8 px-8 h-12 text-black font-black uppercase text-xs"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;

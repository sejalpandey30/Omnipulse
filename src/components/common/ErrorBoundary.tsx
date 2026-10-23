import React, { Component, ErrorInfo, ReactNode } from 'react';
import { appLogger } from '../../core/logger';
import { resolveErrorFallback } from '../../core/errors';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Focusable } from './Focusable';

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    appLogger.error(this.props.moduleName || 'ErrorBoundary', error.message, {
      componentStack: errorInfo.componentStack || undefined,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const info = resolveErrorFallback(this.state.error, this.props.moduleName);

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-tv-card/90 border border-red-500/30 rounded-2xl max-w-lg mx-auto my-12 backdrop-blur-md shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <span className="text-xs uppercase tracking-wider text-red-400 font-bold mb-1">
            {this.props.moduleName || 'Module'} Issue Detected
          </span>
          <h3 className="text-lg font-bold text-white mb-2">{info.message}</h3>
          <p className="text-xs text-slate-400 mb-6 max-w-sm">{info.hint}</p>
          <Focusable
            id={`retry-${(this.props.moduleName || 'module').toLowerCase()}`}
            onSelect={this.handleRetry}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-tv-accent text-slate-950 font-bold text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Module</span>
          </Focusable>
        </div>
      );
    }

    return this.props.children;
  }
}

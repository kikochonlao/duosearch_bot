import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: 'var(--background)', color: 'var(--foreground)',
          padding: 24, textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--destructive), var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, opacity: 0.8,
          }}>!</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 300 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}
            style={{ marginTop: 8, padding: '12px 24px' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

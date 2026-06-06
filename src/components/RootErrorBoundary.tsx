import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RootErrorBoundary', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#333', maxWidth: 560 }}>
          <h1 style={{ fontSize: '1.25rem', marginTop: 0 }}>Ошибка интерфейса</h1>
          <p style={{ lineHeight: 1.5 }}>
            Обновите страницу (<strong>Ctrl+Shift+R</strong>). Если не помогает — очистите данные сайта для
            atomic-asoc.ru.
          </p>
          <pre
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#f5f5f5',
              borderRadius: 8,
              fontSize: '0.75rem',
              overflow: 'auto',
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

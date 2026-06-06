import { PageFrame } from '../layout/PageFrame'
export function UserHandbook() {
  return (
    <PageFrame title="Руководство пользователя">
      <div className="card panel-elevated" style={{ padding: '1rem 1.25rem', width: '100%', maxWidth: 1040 }}>
        <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--text-muted)' }}>
          Текст руководства будет добавлен в следующей редакции приложения.
        </p>
      </div>
    </PageFrame>
  )
}

import { PageFrame } from '../layout/PageFrame'

/** Заготовка раздела; позже здесь будет полноценное руководство. */
export function AdminHandbook() {
  return (
    <PageFrame eyebrow="Справка" title="Руководство администратора">
      <div className="card panel-elevated" style={{ padding: '1rem 1.25rem', width: '100%', maxWidth: 1040 }}>
        <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--text-muted)' }}>
          Текст руководства будет добавлен в следующей редакции приложения.
        </p>
      </div>
    </PageFrame>
  )
}

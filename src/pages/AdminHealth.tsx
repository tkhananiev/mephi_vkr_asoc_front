import { useCallback, useEffect, useState } from 'react'
import { probeHealth, type HealthStatus } from '../api/client'
import { PageFrame } from '../layout/PageFrame'

type ServiceProbe = {
  id: string
  label: string
  healthPath: string
  portHint: string
}

const services: ServiceProbe[] = [
  { id: 'api', label: 'api-service', healthPath: '/health', portHint: ':8080' },
  { id: 'ref', label: 'reference-data-service', healthPath: '/health/reference', portHint: ':8081' },
  { id: 'prc', label: 'processing-service', healthPath: '/health/processing', portHint: ':8082' },
  { id: 'jir', label: 'jira-integration-service', healthPath: '/health/jira', portHint: ':8083' },
  { id: 'sem', label: 'semgrep-service', healthPath: '/health/semgrep', portHint: ':8085' },
]

function Lamp({ status }: { status: HealthStatus }) {
  const cls =
    status === 'ok' ? 'health-lamp health-lamp--ok' : status === 'pending' ? 'health-lamp health-lamp--pending' : 'health-lamp health-lamp--fail'
  const label = status === 'ok' ? 'OK' : status === 'pending' ? '…' : 'недоступен'
  return (
    <span className={cls} title={label} aria-label={label} role="img">
      <span className="health-lamp-dot" />
    </span>
  )
}

export function AdminHealth() {
  const [status, setStatus] = useState<Record<string, HealthStatus>>(() =>
    Object.fromEntries(services.map((s) => [s.id, 'pending' as HealthStatus])),
  )

  const poll = useCallback(async () => {
    setStatus(Object.fromEntries(services.map((s) => [s.id, 'pending' as HealthStatus])))
    const next: Record<string, HealthStatus> = {}
    await Promise.all(
      services.map(async (s) => {
        next[s.id] = await probeHealth(s.healthPath)
      }),
    )
    setStatus(next)
  }, [])

  useEffect(() => {
    void poll()
    const t = setInterval(() => void poll(), 15000)
    return () => clearInterval(t)
  }, [poll])

  return (
    <PageFrame
      eyebrow="Администрирование"
      title="Состояние сервисов"
      lead="Проверка HTTP /health через прокси nginx (или Vite в dev). Зелёный — ответ OK, красный — ошибка или таймаут. Опрос каждые 15 с."
      badge="liveness"
    >
      <div className="toolbar-row">
        <button type="button" className="btn btn-ghost" onClick={() => void poll()}>
          Проверить сейчас
        </button>
      </div>
      <div className="health-grid">
        {services.map((s) => (
          <div key={s.id} className="health-card card">
            <div className="health-card-hd">
              <Lamp status={status[s.id] ?? 'pending'} />
              <div>
                <div className="health-card-title">{s.label}</div>
                <div className="health-card-meta mono">
                  {s.healthPath} · {s.portHint}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  )
}

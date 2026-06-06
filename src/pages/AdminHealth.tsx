import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminDockerLogs,
  adminDockerRestart,
  probeHealth,
  type HealthStatus,
} from '../api/client'
import { PageFrame } from '../layout/PageFrame'

type ServiceProbe = {
  id: string
  label: string
  healthPath: string
  portHint: string
}

const services: ServiceProbe[] = [
  { id: 'api', label: 'api-service', healthPath: '/health', portHint: ':8080' },
  { id: 'auth', label: 'auth-service', healthPath: '/health/auth', portHint: ':8091' },
  { id: 'ref', label: 'reference-data-service', healthPath: '/health/reference', portHint: ':8081' },
  { id: 'prc', label: 'processing-service', healthPath: '/health/processing', portHint: ':8082' },
  { id: 'jir', label: 'jira-integration-service', healthPath: '/health/jira', portHint: ':8083' },
  { id: 'sem', label: 'semgrep-service', healthPath: '/health/semgrep', portHint: ':8085' },
  { id: 'gls', label: 'gitleaks-service', healthPath: '/health/gitleaks', portHint: ':8086' },
  { id: 'sca', label: 'trivy-sca-service', healthPath: '/health/trivy-sca', portHint: ':8088' },
  { id: 'zap', label: 'zap-dast-service', healthPath: '/health/zap-dast', portHint: ':8089' },
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

function LogBody({ text }: { text: string }) {
  return (
    <pre className="health-log-pre mono" tabIndex={0}>
      {text || '(пустой вывод)'}
    </pre>
  )
}

export function AdminHealth() {
  const [status, setStatus] = useState<Record<string, HealthStatus>>(() =>
    Object.fromEntries(services.map((s) => [s.id, 'pending' as HealthStatus])),
  )
  const [logs, setLogs] = useState<Record<string, string>>({})
  const [logErr, setLogErr] = useState<Record<string, string>>({})
  const [logBusy, setLogBusy] = useState<string | null>(null)
  const [restartBusy, setRestartBusy] = useState<string | null>(null)

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

  const logPanelOpen = useCallback(
    (serviceId: string) => logs[serviceId] !== undefined || Boolean(logErr[serviceId]),
    [logs, logErr],
  )

  const collapseLogs = useCallback((serviceId: string) => {
    setLogs((p) => {
      if (p[serviceId] === undefined) return p
      const n = { ...p }
      delete n[serviceId]
      return n
    })
    setLogErr((p) => {
      if (!p[serviceId]) return p
      const n = { ...p }
      delete n[serviceId]
      return n
    })
  }, [])

  const fetchLogs = useCallback(async (serviceId: string) => {
    setLogBusy(serviceId)
    setLogErr((e) => {
      const n = { ...e }
      delete n[serviceId]
      return n
    })
    const r = await adminDockerLogs(serviceId, 300)
    setLogBusy(null)
    if (!r.ok) {
      setLogErr((e) => ({ ...e, [serviceId]: r.error }))
      return
    }
    setLogs((prev) => ({ ...prev, [serviceId]: r.text }))
  }, [])
const scrollToServiceAndFetchLogs = useCallback((serviceId: string) => {
    document.getElementById(`health-service-${serviceId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    void fetchLogs(serviceId)
  }, [fetchLogs])

  const failedServices = useMemo(
    () => services.filter((s) => status[s.id] === 'fail'),
    [status],
  )

  const restart = useCallback(
    async (s: ServiceProbe) => {
      if (
        !window.confirm(
        `Перезапустить deployment «${s.label}»? Сервис на время станет недоступен (rolling restart).`,
        )
      ) {
        return
      }
      setRestartBusy(s.id)
      const r = await adminDockerRestart(s.id)
      setRestartBusy(null)
      if (!r.ok) {
        window.alert(r.error)
        return
      }
      window.alert('Рестарт deployment инициирован.')
      void poll()
    },
    [poll],
  )

  return (
    <PageFrame eyebrow="Администрирование" title="Состояние сервисов">
      <div className="toolbar-row">
        <button type="button" className="btn btn-ghost" onClick={() => void poll()}>
          Проверить сейчас
        </button>
      </div>
      {failedServices.length > 0 ? (
        <div className="health-fail-banner card" role="status">
          <div className="health-fail-banner-title">Недоступны ({failedServices.length})</div>
          <div className="health-fail-banner-links">
            {failedServices.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
                disabled={logBusy === s.id}
                onClick={() => scrollToServiceAndFetchLogs(s.id)}
              >
                {logBusy === s.id ? 'Загрузка…' : `К карточке: ${s.label}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="health-grid">
        {services.map((s) => {
          const st = status[s.id] ?? 'pending'
          const down = st === 'fail'
          return (
            <div
              key={s.id}
              id={`health-service-${s.id}`}
              className={'health-card card' + (down ? ' health-card--down' : '')}
            >
              <div className="health-card-hd">
                <Lamp status={st} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="health-card-title">{s.label}</div>
                  <div className="health-card-meta mono">
                    {s.healthPath} · {s.portHint}
                  </div>
                  {down ? (
                    <p className="health-card-hint" style={{ marginTop: '0.35rem', lineHeight: 1.45 }}>
                      Нет ответа по /health — по кнопке «Логи» ниже можно посмотреть вывод пода или статус в кластере.
                    </p>
                  ) : null}
                  <div className="health-card-ops">
                    <div className="health-card-ops-btns">
                      {logPanelOpen(s.id) ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
                            disabled={logBusy === s.id}
                            onClick={() => void fetchLogs(s.id)}
                          >
                            {logBusy === s.id ? 'Обновление…' : 'Обновить'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                            disabled={logBusy === s.id}
                            onClick={() => collapseLogs(s.id)}
                          >
                            Свернуть
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                          disabled={logBusy === s.id}
                          onClick={() => void fetchLogs(s.id)}
                        >
                          {logBusy === s.id ? 'Логи…' : 'Логи'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                        disabled={restartBusy === s.id}
                        onClick={() => void restart(s)}
                      >
                        {restartBusy === s.id ? 'Перезапуск…' : 'Перезапуск'}
                      </button>
                    </div>
                    {logErr[s.id] ? (
                      <p
                        className="err health-card-ops-err"
                        style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {logErr[s.id]}
                      </p>
                    ) : null}
                    {logs[s.id] !== undefined ? <LogBody text={logs[s.id] ?? ''} /> : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </PageFrame>
  )
}

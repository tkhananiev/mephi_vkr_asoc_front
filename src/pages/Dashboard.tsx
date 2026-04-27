import { Link } from 'react-router-dom'
import { PageFrame } from '../layout/PageFrame'

export function Dashboard() {
  return (
    <PageFrame eyebrow="ASOC" title="Обзор" lead="Контур согласования находок SAST со справочниками уязвимостей и постановкой задач в трекер." badge="стенд">
      <div className="grid-stats">
        <Link to="/scan" className="stat stat--link">
          <div className="stat-label">Сканирование</div>
          <div className="stat-desc">Запуск сценария Semgrep и цепочки обработки</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/report" className="stat stat--link">
          <div className="stat-label">Отчёт</div>
          <div className="stat-desc">Уязвимости по группам: CVE, БДУ, сканер, актив</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/admin/health" className="stat stat--link">
          <div className="stat-label">Сервисы</div>
          <div className="stat-desc">Быстрая проверка доступности микросервисов</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/reference" className="stat stat--link">
          <div className="stat-label">Справочник</div>
          <div className="stat-desc">Синхронизация каталогов NVD и БДУ</div>
          <div className="stat-value">→</div>
        </Link>
      </div>
    </PageFrame>
  )
}

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BranchListEditor } from '../components/BranchListEditor'
import { PageFrame } from '../layout/PageFrame'
import { createProduct, dedupeBranches, DEFAULT_SEMGREP_MOUNT_PATH } from '../lib/productsStorage'
import { isValidRepoUrl } from '../lib/repoUrl'

export function ProductCreate() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [repositorySubdirectory, setRepositorySubdirectory] = useState('')
  const [branches, setBranches] = useState<string[]>(['main'])
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const n = name.trim()
    const u = repositoryUrl.trim()
    const sub = repositorySubdirectory
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
    const normBranches = dedupeBranches(branches)

    if (!n) {
      setErr('Укажите название продукта.')
      return
    }

    try {
      if (!u) {
        const mount = DEFAULT_SEMGREP_MOUNT_PATH.endsWith('/')
          ? DEFAULT_SEMGREP_MOUNT_PATH
          : `${DEFAULT_SEMGREP_MOUNT_PATH}/`
        await createProduct(n, description, '', 'main', '', mount, ['main'])
        navigate('/app/products', { replace: true, state: { justCreated: true } })
        return
      }

      if (!isValidRepoUrl(u)) {
        setErr('Введите корректный адрес репозитория: HTTPS, SSH (git@host:…) или другой URI.')
        return
      }
      await createProduct(n, description, u, normBranches[0] ?? 'main', sub, '', normBranches)
      navigate('/app/products', { replace: true, state: { justCreated: true } })
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex))
    }
  }

  return (
    <PageFrame
      eyebrow="Продукт"
      title="Добавить продукт"
      lead="Продукт сохраняется на сервере в вашей учётной записи. Для SCM: shallow clone и checkout по выбранной ветке при запуске скана в разделе SAST."
    >
      <div className="panel-elevated" style={{ width: '100%', maxWidth: 960, padding: '1.25rem 1.35rem' }}>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Наименование продукта</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: портал самообслуживания"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Описание</span>
            <span className="hint">Необязательно.</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Назначение, контуры, заметки…"
              rows={3}
              autoComplete="off"
              spellCheck={true}
            />
          </label>
          <label className="field">
            <span>URI репозитория (SCM)</span>
            <span className="hint">
              Без адреса используется встроенный каталог платформы (WebGoat) внутри образа semgrep-service.
            </span>
            <input
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://gitlab.example.gov/org/service.git"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {repositoryUrl.trim() ? (
            <>
              <div className="field">
                <span>Ветки для сканирования</span>
                <span className="hint">
                  Выберите одну или несколько веток из репозитория; при запуске сканирования выберете, какую из списка клонировать.
                </span>
                <BranchListEditor repositoryUrl={repositoryUrl} branches={branches} onChange={setBranches} />
              </div>
              <label className="field">
                <span>Подкаталог в репозитории</span>
                <span className="hint">Относительный путь от корня клона; пусто — весь репозиторий.</span>
                <input
                  value={repositorySubdirectory}
                  onChange={(e) => setRepositorySubdirectory(e.target.value)}
                  placeholder="например: server или pkg/core"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </>
          ) : null}
          {err ? <p className="err">{err}</p> : null}
          <div className="form-actions" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/app/products" className="btn btn-ghost">
              Отмена
            </Link>
            <button type="submit" className="btn btn-solid">
              Сохранить продукт
            </button>
          </div>
        </form>
      </div>
    </PageFrame>
  )
}

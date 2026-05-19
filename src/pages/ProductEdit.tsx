import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageFrame } from '../layout/PageFrame'
import {
  dedupeBranches,
  DEFAULT_SEMGREP_MOUNT_PATH,
  invalidateProductsCache,
  listProducts,
  updateProduct,
  type StoredProduct,
} from '../lib/productsStorage'
import { isValidRepoUrl } from '../lib/repoUrl'

export function ProductEdit() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const numericId = useMemo(() => {
    const n = Number(productId)
    return Number.isFinite(n) ? n : NaN
  }, [productId])

  const [initial, setInitial] = useState<StoredProduct | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [repositorySubdirectory, setRepositorySubdirectory] = useState('')
  const [branches, setBranches] = useState<string[]>(['main'])
  const [err, setErr] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoadErr(null)
    try {
      invalidateProductsCache()
      const rows = await listProducts()
      const p = rows.find((x) => x.id === numericId)
      if (!p) {
        setInitial(null)
        setLoadErr('Продукт не найден.')
        return
      }
      setInitial(p)
      setName(p.name)
      setDescription(p.description)
      setRepositoryUrl(p.repositoryUrl ?? '')
      setRepositorySubdirectory(p.repositorySubdirectory ?? '')
      setBranches(p.repositoryBranchRefs?.length ? [...p.repositoryBranchRefs] : [p.repositoryRef || 'main'])
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e))
    }
  }, [numericId])

  useEffect(() => {
    if (!Number.isFinite(numericId)) return
    void refresh()
  }, [numericId, refresh])

  function updateBranch(idx: number, val: string) {
    setBranches((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }

  function addBranch() {
    setBranches((prev) => [...prev, ''])
  }

  function removeBranch(idx: number) {
    setBranches((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!Number.isFinite(numericId) || !initial) return
    const n = name.trim()
    const u = repositoryUrl.trim()
    const sub = repositorySubdirectory.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    const normBranches = dedupeBranches(branches)

    if (!n) {
      setErr('Укажите название продукта.')
      return
    }

    try {
      if (!u) {
        const mount = DEFAULT_SEMGREP_MOUNT_PATH.endsWith('/') ? DEFAULT_SEMGREP_MOUNT_PATH : `${DEFAULT_SEMGREP_MOUNT_PATH}/`
        await updateProduct(numericId, n, description, '', 'main', '', mount, ['main'])
        navigate('/app/products', { replace: true })
        return
      }

      if (!isValidRepoUrl(u)) {
        setErr('Введите корректный адрес репозитория: HTTPS, SSH (git@host:…) или другой URI.')
        return
      }
      await updateProduct(numericId, n, description, u, normBranches[0] ?? 'main', sub, '', normBranches)
      navigate('/app/products', { replace: true })
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex))
    }
  }

  if (!Number.isFinite(numericId)) {
    return (
      <PageFrame eyebrow="Продукт" title="Редактор" lead="">
        <p className="err">Некорректный идентификатор.</p>
        <Link to="/app/products">К списку</Link>
      </PageFrame>
    )
  }

  if (loadErr) {
    return (
      <PageFrame eyebrow="Продукт" title="Редактор" lead="">
        <p className="err">{loadErr}</p>
        <Link to="/app/products" className="btn btn-ghost">
          К списку продуктов
        </Link>
      </PageFrame>
    )
  }

  if (!initial) {
    return (
      <PageFrame eyebrow="Продукт" title="Загрузка…" lead="">
        <p style={{ color: 'var(--text-muted)' }}>Загрузка карточки продукта…</p>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      eyebrow="Продукт"
      title="Изменить продукт"
      lead={`Редактирование «${initial.name}». После сохранения запуск сканирования будет использовать новые параметры SCM.`}
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
            <span className="hint">Без адреса сканирование идёт по демо-пути платформы (WebGoat) внутри образа semgrep-service.</span>
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
                  Укажите одну или несколько веток (или тегов); при запуске SAST выберете, какую из списка клонировать.
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {branches.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        value={b}
                        onChange={(e) => updateBranch(idx, e.target.value)}
                        placeholder={idx === 0 ? 'main' : 'например: develop'}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ flex: 1 }}
                      />
                      {branches.length > 1 ? (
                        <button type="button" className="btn btn-ghost" onClick={() => removeBranch(idx)} aria-label="Удалить ветку">
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: '0.85rem' }} onClick={addBranch}>
                    + добавить ветку
                  </button>
                </div>
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
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </PageFrame>
  )
}

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { fetchRepositoryBranches } from '../lib/productsStorage'

type Props = {
  repositoryUrl: string
  branches: string[]
  onChange: (branches: string[]) => void
  disabled?: boolean
  compact?: boolean
  error?: string | null
  onError?: (message: string | null) => void
}

function branchTaken(selected: string[], name: string): boolean {
  const norm = name.trim().toLowerCase()
  return selected.some((b) => b.trim().toLowerCase() === norm)
}

export function RepositoryBranchPicker({
  repositoryUrl,
  branches,
  onChange,
  disabled = false,
  compact = false,
  error = null,
  onError,
}: Props) {
  const [remoteBranches, setRemoteBranches] = useState<string[]>([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteErr, setRemoteErr] = useState<string | null>(null)
  const [pick, setPick] = useState('')

  const repoUrl = repositoryUrl.trim()

  useEffect(() => {
    if (!repoUrl) {
      setRemoteBranches([])
      setRemoteErr(null)
      setLoadingRemote(false)
      return
    }
    let cancelled = false
    setLoadingRemote(true)
    setRemoteErr(null)
    void fetchRepositoryBranches(repoUrl)
      .then((rows) => {
        if (cancelled) return
        setRemoteBranches(rows)
        setRemoteErr(null)
      })
      .catch((e) => {
        if (cancelled) return
        setRemoteBranches([])
        setRemoteErr(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoadingRemote(false)
      })
    return () => {
      cancelled = true
    }
  }, [repoUrl])

  const available = useMemo(
    () => remoteBranches.filter((b) => !branchTaken(branches, b)),
    [remoteBranches, branches],
  )

  useEffect(() => {
    if (!pick || !available.includes(pick)) {
      setPick(available[0] ?? '')
    }
  }, [available, pick])

  function clearLocalError() {
    onError?.(null)
  }

  function onRemove(branch: string) {
    if (branches.length <= 1) {
      const msg = 'Должна остаться хотя бы одна ветка.'
      onError?.(msg)
      return
    }
    clearLocalError()
    onChange(branches.filter((b) => b !== branch))
  }

  function onAdd(e: FormEvent) {
    e.preventDefault()
    const name = pick.trim()
    if (!name) {
      const msg = loadingRemote
        ? 'Загрузка списка веток…'
        : available.length === 0
          ? 'Нет веток для добавления.'
          : 'Выберите ветку из списка.'
      onError?.(msg)
      return
    }
    if (branchTaken(branches, name)) {
      onError?.('Такая ветка уже есть в списке.')
      return
    }
    clearLocalError()
    onChange([...branches, name])
  }

  const showErr = error ?? remoteErr

  return (
    <div className={'repository-branch-picker' + (compact ? ' repository-branch-picker--compact' : '')}>
      <div className="product-card-branch-chips" aria-label="Список веток">
        {branches.map((b) => (
          <span key={b} className="product-card-branch-chip">
            <code>{b}</code>
            {branches.length > 1 ? (
              <button
                type="button"
                className="product-card-branch-chip-remove"
                onClick={() => onRemove(b)}
                disabled={disabled}
                aria-label={`Удалить ветку ${b}`}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>
      <form className="product-card-branch-add" onSubmit={(e) => void onAdd(e)}>
        <select
          value={pick}
          onChange={(e) => {
            setPick(e.target.value)
            clearLocalError()
          }}
          disabled={disabled || loadingRemote || available.length === 0}
          aria-label="Ветка из репозитория"
          className="repository-branch-picker-select"
        >
          {loadingRemote ? (
            <option value="">Загрузка веток…</option>
          ) : available.length === 0 ? (
            <option value="">
              {remoteBranches.length === 0 ? 'Ветки не найдены' : 'Все ветки уже добавлены'}
            </option>
          ) : (
            available.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))
          )}
        </select>
        <button
          type="submit"
          className="btn btn-ghost btn--sm"
          disabled={disabled || loadingRemote || !pick.trim()}
        >
          Добавить
        </button>
      </form>
      {showErr ? <p className="err product-card-branches-err">{showErr}</p> : null}
    </div>
  )
}

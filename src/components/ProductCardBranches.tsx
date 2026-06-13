import { useEffect, useState } from 'react'
import { dedupeBranches, updateProductBranches, type StoredProduct } from '../lib/productsStorage'
import { RepositoryBranchPicker } from './RepositoryBranchPicker'

type Props = {
  product: StoredProduct
  onUpdated: (product: StoredProduct) => void
}

export function ProductCardBranches({ product, onUpdated }: Props) {
  const [branches, setBranches] = useState<string[]>(
    product.repositoryBranchRefs?.length ? [...product.repositoryBranchRefs] : [product.repositoryRef || 'main'],
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setBranches(
      product.repositoryBranchRefs?.length ? [...product.repositoryBranchRefs] : [product.repositoryRef || 'main'],
    )
    setErr(null)
  }, [product.id, product.repositoryBranchRefs, product.repositoryRef])

  async function persist(nextBranches: string[]) {
    const norm = dedupeBranches(nextBranches)
    setBusy(true)
    setErr(null)
    try {
      const updated = await updateProductBranches(product.id, norm)
      setBranches(updated.repositoryBranchRefs?.length ? [...updated.repositoryBranchRefs] : [updated.repositoryRef])
      onUpdated(updated)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="product-card-branches">
      <div className="product-card-branches-head">
        <span className="product-card-branches-title">Ветки для сканирования</span>
        {busy ? <span className="hint product-card-branches-busy">Сохранение…</span> : null}
      </div>
      <RepositoryBranchPicker
        repositoryUrl={product.repositoryUrl}
        branches={branches}
        onChange={(next) => void persist(next)}
        disabled={busy}
        compact
        error={err}
        onError={setErr}
      />
    </div>
  )
}

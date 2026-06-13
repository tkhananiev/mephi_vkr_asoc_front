import { RepositoryBranchPicker } from './RepositoryBranchPicker'

type Props = {
  repositoryUrl: string
  branches: string[]
  onChange: (branches: string[]) => void
  disabled?: boolean
  compact?: boolean
}

export function BranchListEditor({
  repositoryUrl,
  branches,
  onChange,
  disabled = false,
  compact = false,
}: Props) {
  return (
    <RepositoryBranchPicker
      repositoryUrl={repositoryUrl}
      branches={branches}
      onChange={onChange}
      disabled={disabled}
      compact={compact}
    />
  )
}

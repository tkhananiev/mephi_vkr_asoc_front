import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type GroupKebabAction =
  | { id: 'false_positive'; label: string }
  | { id: 'risk_accepted'; label: string }
  | { id: 'jira_fix'; label: string }
  | { id: 'reopen'; label: string }

type Props = {
  groupId: number
  disabled?: boolean
  actions: GroupKebabAction[]
  onSelect: (actionId: GroupKebabAction['id']) => void
  align?: 'start' | 'end'
}

type PanelPos = { top: number; left: number; minWidth: number; maxHeight: number }

const PANEL_GAP = 4
const VIEWPORT_PAD = 8
const PANEL_MIN_WIDTH = 200
const EST_ITEM_PX = 36

function computePanelPos(
  btn: HTMLButtonElement,
  panel: HTMLUListElement | null,
  actionCount: number,
  align: 'start' | 'end',
): PanelPos {
  const rect = btn.getBoundingClientRect()
  const minWidth = PANEL_MIN_WIDTH
  const left = align === 'start' ? rect.left : Math.max(VIEWPORT_PAD, rect.right - minWidth)
  const estHeight = actionCount * EST_ITEM_PX + 12
  const panelHeight = panel?.offsetHeight ?? estHeight
  const maxHeight = Math.max(120, window.innerHeight - VIEWPORT_PAD * 2)

  let top = rect.bottom + PANEL_GAP
  if (top + panelHeight > window.innerHeight - VIEWPORT_PAD) {
    top = rect.top - panelHeight - PANEL_GAP
  }
  top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - Math.min(panelHeight, maxHeight) - VIEWPORT_PAD))

  return { top, left, minWidth, maxHeight }
}

export function GroupRowKebab({ groupId, disabled, actions, onSelect, align = 'end' }: Props) {
  const menuId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null)

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setPanelPos(null)
      return
    }
    const place = () => {
      if (!btnRef.current) return
      setPanelPos(computePanelPos(btnRef.current, panelRef.current, actions.length, align))
    }
    place()
    const raf = requestAnimationFrame(place)
    return () => cancelAnimationFrame(raf)
  }, [open, align, actions.length])

  useEffect(() => {
    if (!open) return
    const close = (ev: MouseEvent | KeyboardEvent) => {
      const t = ev.target as HTMLElement | null
      if (t?.closest(`[data-group-kebab="${menuId}"]`)) return
      if (t?.closest(`[data-group-kebab-panel="${menuId}"]`)) return
      setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, menuId])

  if (actions.length === 0) return null

  const menuClass = align === 'start' ? 'admin-users-menu admin-users-menu--start' : 'admin-users-menu'
  const panelClass =
    align === 'start' ? 'admin-users-kebab-panel admin-users-kebab-panel--start' : 'admin-users-kebab-panel'

  const panel =
    open && panelPos
      ? createPortal(
          <ul
            ref={panelRef}
            className={`${panelClass} admin-users-kebab-panel--fixed`}
            role="menu"
            data-group-kebab-panel={menuId}
            style={{
              position: 'fixed',
              top: panelPos.top,
              left: panelPos.left,
              minWidth: panelPos.minWidth,
              maxHeight: panelPos.maxHeight,
              overflowY: 'auto',
              zIndex: 1200,
            }}
          >
            {actions.map((a) => (
              <li key={a.id} role="presentation">
                <button
                  type="button"
                  role="menuitem"
                  className="admin-users-kebab-item"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false)
                    onSelect(a.id)
                  }}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null

  return (
    <div className={menuClass} data-group-kebab={menuId}>
      <button
        ref={btnRef}
        type="button"
        className="admin-users-kebab-btn"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Действия для группы ${groupId}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span aria-hidden className="admin-users-kebab-dots">
          ⋮
        </span>
      </button>
      {panel}
    </div>
  )
}

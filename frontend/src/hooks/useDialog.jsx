import { useState, useCallback, useRef } from 'react'

/**
 * useDialog — replaces window.confirm() and window.alert() with styled in-app dialogs.
 *
 * Usage:
 *   const { dialog, confirm, alert } = useDialog()
 *   // render <>{dialog}</> somewhere in the component tree
 *
 *   await confirm('Are you sure?')        → true | false
 *   await alert('Something went wrong')   → void (waits for OK click)
 */
export function useDialog() {
  const [state, setState] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((message, { title = 'ยืนยัน', danger = false } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setState({ type: 'confirm', message, title, danger })
    })
  }, [])

  const alert = useCallback((message, { title = 'แจ้งเตือน' } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setState({ type: 'alert', message, title })
    })
  }, [])

  const close = (result) => {
    setState(null)
    resolveRef.current?.(result)
    resolveRef.current = null
  }

  const dialog = state ? (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) close(false) }}
    >
      <div style={{
        background: 'var(--fc-card)',
        border: '1px solid var(--fc-border)',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '24px 24px 20px',
        maxWidth: 380,
        width: '100%',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fc-text)', marginBottom: 10 }}>
          {state.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--fc-text-3)', lineHeight: 1.6, marginBottom: 20 }}>
          {state.message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {state.type === 'confirm' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => close(false)}
            >
              ยกเลิก
            </button>
          )}
          <button
            className="btn btn-sm"
            style={state.danger
              ? { background: 'var(--fc-danger)', color: '#fff', border: 'none' }
              : { background: 'var(--fc-primary)', color: '#fff', border: 'none' }
            }
            onClick={() => close(state.type === 'confirm' ? true : undefined)}
            autoFocus
          >
            {state.type === 'confirm' ? 'ยืนยัน' : 'ตกลง'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { dialog, confirm, alert }
}

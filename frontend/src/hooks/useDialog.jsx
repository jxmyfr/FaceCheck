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

  const prompt = useCallback((message, { title = 'กรอกข้อมูล', placeholder = '', required = false } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setState({ type: 'prompt', message, title, placeholder, required, inputValue: '' })
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
      onClick={e => { if (e.target === e.currentTarget) close(state.type === 'prompt' ? null : false) }}
    >
      <div style={{
        background: '#ffffff',
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
        <div style={{ fontSize: 13, color: 'var(--fc-text-3)', lineHeight: 1.6, marginBottom: state.type === 'prompt' ? 12 : 20 }}>
          {state.message}
        </div>
        {state.type === 'prompt' && (
          <input
            autoFocus
            type="text"
            placeholder={state.placeholder}
            defaultValue=""
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px', borderRadius: 8, marginBottom: 16,
              border: '1px solid var(--fc-border)',
              fontSize: 13, color: 'var(--fc-text)',
              outline: 'none',
            }}
            onChange={e => setState(s => ({ ...s, inputValue: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = state.inputValue?.trim()
                if (state.required && !val) return
                close(val || null)
              }
              if (e.key === 'Escape') close(null)
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {(state.type === 'confirm' || state.type === 'prompt') && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => close(state.type === 'prompt' ? null : false)}
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
            onClick={() => {
              if (state.type === 'prompt') {
                const val = state.inputValue?.trim()
                if (state.required && !val) return
                close(val || null)
              } else {
                close(state.type === 'confirm' ? true : undefined)
              }
            }}
          >
            {state.type === 'confirm' ? 'ยืนยัน' : state.type === 'prompt' ? 'ตกลง' : 'ตกลง'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { dialog, confirm, alert, prompt }
}

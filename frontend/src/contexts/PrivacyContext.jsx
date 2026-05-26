import { createContext, useContext, useState, useCallback } from 'react'

const PrivacyContext = createContext(null)

export function PrivacyProvider({ children }) {
  const [privacyMode, setPrivacyMode] = useState(
    () => localStorage.getItem('fc-privacy') === '1'
  )
  const togglePrivacy = useCallback(() => {
    setPrivacyMode(p => {
      const next = !p
      localStorage.setItem('fc-privacy', next ? '1' : '0')
      return next
    })
  }, [])
  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}

// "ไชยวงศ์" (7) → "ไชยxxxx" — show floor(len/2) chars, replace rest with x
export function censorLastName(name) {
  if (!name) return name
  const show = Math.max(1, Math.floor(name.length / 2))
  return name.slice(0, show) + 'x'.repeat(name.length - show)
}

// censor last word of a combined full-name string (title + first + last)
export function censorFullName(fullName) {
  if (!fullName) return fullName
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return censorLastName(fullName)
  parts[parts.length - 1] = censorLastName(parts[parts.length - 1])
  return parts.join(' ')
}

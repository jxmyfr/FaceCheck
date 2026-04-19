import { useState, useEffect, createContext, useContext } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  // ตั้ง axios default header ทุกครั้งที่ token เปลี่ยน
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('access_token', token)
    } else {
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem('access_token')
    }
  }, [token])

  // โหลด user จาก token ที่มีอยู่ตอน refresh หน้า
  useEffect(() => {
    if (!token) { setLoading(false); return }
    axios.get(`${API}/auth/me`)
      .then(res => setUser(res.data))
      .catch(() => { setToken(null); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password })
    setToken(res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('refresh_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { api } from './api/client'
import Welcome from './pages/Welcome'
import Register from './pages/Register'
import Discover from './pages/Discover'
import ProfilePage from './pages/ProfilePage'
import EditProfile from './pages/EditProfile'
import MatchesList from './pages/MatchesList'
import ChatList from './pages/ChatList'
import Chat from './pages/Chat'
import MatchScreen from './pages/MatchScreen'
import Settings from './pages/Settings'

export default function App() {
  const [user, setUser] = useState<{ telegram_id: number; username: string | null; is_registered: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.initData) {
      api.login(tg.initData).then(data => {
        setUser(data)
        setLoading(false)
        if (data.is_registered) navigate('/discover', { replace: true })
        else navigate('/welcome', { replace: true })
      }).catch(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const hideBack = location.pathname === '/discover' || location.pathname === '/welcome'
    if (hideBack) tg?.BackButton?.hide()
    else {
      tg?.BackButton?.show()
      tg?.BackButton?.onClick(() => navigate(-1))
    }
    return () => tg?.BackButton?.offClick(() => {})
  }, [location])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--tg-bg)', color: 'var(--tg-hint)',
      }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: 120, height: 14 }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg)', color: 'var(--tg-text)' }}>
      <Routes>
        <Route path="/welcome" element={<Welcome user={user} />} />
        <Route path="/register" element={<Register user={user} />} />
        <Route path="/discover" element={<Discover user={user} />} />
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="/profile/edit" element={<EditProfile user={user} />} />
        <Route path="/matches" element={<MatchesList user={user} />} />
        <Route path="/chats" element={<ChatList user={user} />} />
        <Route path="/chat/:matchId" element={<Chat user={user} />} />
        <Route path="/match/:matchId" element={<MatchScreen user={user} />} />
        <Route path="/settings" element={<Settings user={user} />} />
        <Route path="*" element={<Welcome user={user} />} />
      </Routes>

      {user?.is_registered && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '6px 4px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--tg-secondary-bg)',
          borderTop: '1px solid var(--tg-border)',
          backdropFilter: 'blur(20px)',
        }}>
          <NavBtn label="Discover" icon="🔍" active={location.pathname === '/discover'} onClick={() => navigate('/discover')} />
          <NavBtn label="Matches" icon="❤️" active={location.pathname.startsWith('/match')} onClick={() => navigate('/matches')} />
          <NavBtn label="Chats" icon="💬" active={location.pathname.startsWith('/chat')} onClick={() => navigate('/chats')} />
          <NavBtn label="Profile" icon="👤" active={location.pathname.startsWith('/profile')} onClick={() => navigate('/profile')} />
        </nav>
      )}
    </div>
  )
}

function NavBtn({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center',
      padding: '6px 12px', borderRadius: 10, transition: 'all 0.2s',
      color: active ? 'var(--tg-button)' : 'var(--tg-hint)',
      opacity: active ? 1 : 0.6,
    }}>
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</div>
    </button>
  )
}

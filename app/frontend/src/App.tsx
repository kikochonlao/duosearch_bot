import { useEffect, useState, type ReactNode } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Compass, Gamepad2, Heart, MessageCircle, User } from 'lucide-react'
import { api } from './api/client'
import { impact } from './utils/haptic'
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
import UserProfile from './pages/UserProfile'
import LobbyList from './pages/LobbyList'
import LobbyCreate from './pages/LobbyCreate'
import LobbyView from './pages/LobbyView'

const MAINTENANCE = false

const NAV_ITEMS = [
  { path: '/discover', icon: Compass, label: 'Discover' },
  { path: '/lobbies', icon: Gamepad2, label: 'Lobbies' },
  { path: '/matches', icon: Heart, label: 'Matches' },
  { path: '/chats', icon: MessageCircle, label: 'Chats' },
  { path: '/profile', icon: User, label: 'Profile' },
]

function NavBtn({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Compass; active: boolean; onClick: () => void }) {
  return (
    <button onClick={() => { impact('light'); onClick() }} style={{
      flex: 1, background: 'none', border: 'none', cursor: 'pointer',
      textAlign: 'center', padding: '8px 4px', borderRadius: 10,
      transition: 'all 0.2s', fontFamily: 'inherit',
    }}>
      <div style={{
        marginBottom: 2,
        color: active ? 'var(--primary)' : 'var(--muted-foreground)',
      }}>
        <Icon size={22} />
      </div>
      <div style={{
        fontSize: 10, fontWeight: active ? 600 : 400,
        color: active ? 'var(--primary)' : 'var(--muted-foreground)',
      }}>{label}</div>
    </button>
  )
}

export default function App() {
  const [user, setUser] = useState<{ telegram_id: number; username: string | null; is_registered: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    tg?.requestFullscreen?.()
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
    if (hideBack) { tg?.BackButton?.hide() } else {
      const handler = () => navigate(-1)
      tg?.BackButton?.show()
      tg?.BackButton?.onClick(handler)
      return () => tg?.BackButton?.offClick(handler)
    }
  }, [location])

  if (MAINTENANCE) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--background)', color: 'var(--foreground)',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 8, opacity: 0.8,
        }}>🚧</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Coming Soon</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 280, lineHeight: 1.5 }}>
          Mini app is under development. We'll be back soon!
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--background)', color: 'var(--muted-foreground)',
      }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: 120, height: 14 }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      <Routes>
        <Route path="/welcome" element={<Welcome user={user} />} />
        <Route path="/register" element={<Register user={user} onRegistered={() => {
          const tg = window.Telegram?.WebApp
          if (tg?.initData) api.login(tg.initData).then(data => setUser(data))
        }} />} />
        <Route path="/discover" element={<Discover user={user} />} />
        <Route path="/lobbies" element={<LobbyList user={user} />} />
        <Route path="/lobbies/create" element={<LobbyCreate user={user} />} />
        <Route path="/lobbies/:lobbyId" element={<LobbyView user={user} />} />
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="/profile/edit" element={<EditProfile user={user} />} />
        <Route path="/matches" element={<MatchesList user={user} />} />
        <Route path="/chats" element={<ChatList user={user} />} />
        <Route path="/chat/:matchId" element={<Chat user={user} />} />
        <Route path="/match/:matchId" element={<MatchScreen user={user} />} />
        <Route path="/settings" element={<Settings user={user} />} />
        <Route path="/user/:telegramId" element={<UserProfile user={user} />} />
        <Route path="*" element={<Welcome user={user} />} />
      </Routes>

      {user?.is_registered && !location.pathname.startsWith('/chat/') && !location.pathname.startsWith('/match/') && !location.pathname.startsWith('/lobbies/') && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center',
          padding: '6px 8px',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(18, 16, 30, 0.95)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
          maxWidth: 430,
          margin: '0 auto',
        }}>
          {NAV_ITEMS.map(item => (
            <NavBtn
              key={item.path}
              label={item.label}
              icon={item.icon}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>
      )}
    </div>
  )
}

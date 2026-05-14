import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
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

const TG_HEADER = '#17212b'
const TG_BG = '#17212b'

function setTheme() {
  const tg = window.Telegram?.WebApp
  tg?.setHeaderColor?.(TG_HEADER)
  tg?.setBackgroundColor?.(TG_BG)
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: TG_BG,
    color: '#fff',
    padding: '16px',
  }
}

export default function App() {
  const [user, setUser] = useState<{ telegram_id: number; username: string | null; is_registered: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setTheme()
    const tg = window.Telegram?.WebApp
    if (tg?.initData) {
      api.login(tg.initData).then(data => {
        setUser(data)
        setLoading(false)
        if (data.is_registered) {
          navigate('/discover')
        } else {
          navigate('/welcome')
        }
      }).catch(() => {
        setLoading(false)
        navigate('/welcome')
      })
    } else {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
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
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-around',
          padding: '8px 4px', backgroundColor: '#1f2a36',
          borderTop: '1px solid #2b3b4a',
          zIndex: 100,
        }}>
          <NavBtn label="Discover" icon="🔍" onClick={() => navigate('/discover')} />
          <NavBtn label="Matches" icon="❤️" onClick={() => navigate('/matches')} />
          <NavBtn label="Chats" icon="💬" onClick={() => navigate('/chats')} />
          <NavBtn label="Profile" icon="👤" onClick={() => navigate('/profile')} />
        </nav>
      )}
    </div>
  )
}

function NavBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: '#8e9eab',
      fontSize: '11px', cursor: 'pointer', textAlign: 'center',
      padding: '4px 8px',
    }}>
      <div style={{ fontSize: '20px', marginBottom: '2px' }}>{icon}</div>
      {label}
    </button>
  )
}

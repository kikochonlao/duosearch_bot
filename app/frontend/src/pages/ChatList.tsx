import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ChatSessionInfo } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function ChatList({ user }: Props) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getChatSessions().then(data => {
      setSessions(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh', color: '#8e9eab' }}>Loading chats...</div>
  }

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Chats</h2>

      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
          <p style={{ color: '#8e9eab' }}>No active chats. Match with someone to start chatting!</p>
        </div>
      )}

      {sessions.map(s => (
        <div key={s.id} onClick={() => navigate(`/chat/${s.match_id}`)} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
          backgroundColor: '#1f2a36', borderRadius: '12px', marginBottom: 8, cursor: 'pointer', 
          opacity: s.is_active ? 1 : 0.6,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', backgroundColor: '#2b3b4a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            flexShrink: 0,
          }}>
            {s.other_user.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{s.other_user.name}</div>
            <div style={{ color: '#8e9eab', fontSize: '13px' }}>
              {s.is_active ? 'Active' : 'Closed'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

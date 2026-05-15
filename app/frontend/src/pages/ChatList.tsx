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
    api.getChatSessions().then(data => { setSessions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="page">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 8 }} />)}</div>
  }

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Chats</h2>

      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--tg-hint)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <p>No chats yet. Match with someone!</p>
        </div>
      )}

      {sessions.map(s => (
        <div key={s.id} className="list-item" onClick={() => navigate(`/chat/${s.match_id}`)}
          style={{ opacity: s.is_active ? 1 : 0.5 }}>
          <div className="avatar">
            {s.other_user.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{s.other_user.name}</div>
            <div style={{ color: 'var(--tg-hint)', fontSize: 13 }}>
              {s.is_active ? 'Active now' : 'Chat closed'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

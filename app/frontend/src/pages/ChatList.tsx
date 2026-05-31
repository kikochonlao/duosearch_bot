import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
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
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', paddingTop: 80, textAlign: 'center',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20, opacity: 0.8,
          }}>
            <MessageCircle size={36} />
          </div>
          <h3 style={{ fontSize: 20, marginBottom: 8, color: 'var(--foreground)' }}>
            No chats yet
          </h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 280, lineHeight: 1.5 }}>
            Match with someone and start a conversation!
          </p>
        </div>
      )}

      {sessions.map(s => (
        <div key={s.id} className="list-item" onClick={() => navigate(`/chat/${s.match_id}`)}
          style={{ opacity: s.is_active ? 1 : 0.5 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 600, color: '#fff',
          }}>
            {s.other_user.photo_url ? (
              <img src={s.other_user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { const t = e.currentTarget; t.style.display = 'none'; t.parentElement!.innerText = s.other_user.name[0].toUpperCase() }} />
            ) : s.other_user.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{s.other_user.name}</div>
            <div style={{
              color: 'var(--tg-hint)', fontSize: 13,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              {s.last_message || (s.is_active ? 'Active now' : 'Chat closed')}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

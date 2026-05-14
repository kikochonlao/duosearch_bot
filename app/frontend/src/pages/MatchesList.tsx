import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, MatchItem } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function MatchesList({ user }: Props) {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMatches().then(data => {
      setMatches(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh', color: '#8e9eab' }}>Loading matches...</div>
  }

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Your Matches</h2>

      {matches.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💔</div>
          <p style={{ color: '#8e9eab' }}>No matches yet. Keep exploring!</p>
        </div>
      )}

      {matches.map(m => (
        <div key={m.id} onClick={() => navigate(`/chat/${m.id}`)} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
          backgroundColor: '#1f2a36', borderRadius: '12px', marginBottom: 8, cursor: 'pointer',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', backgroundColor: '#2b3b4a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            flexShrink: 0,
          }}>
            {m.matched_user.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{m.matched_user.name}, {m.matched_user.age}</div>
            <div style={{ color: '#8e9eab', fontSize: '13px' }}>
              {Object.keys(m.matched_user.games).length} games · {m.matched_user.region.toUpperCase()}
            </div>
          </div>
          {m.has_active_chat && (
            <div style={{ color: '#4caf50', fontSize: '12px' }}>Chatting</div>
          )}
        </div>
      ))}
    </div>
  )
}

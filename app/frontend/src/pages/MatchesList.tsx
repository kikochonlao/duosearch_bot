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
    api.getMatches().then(data => { setMatches(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="page">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 8 }} />)}</div>
  }

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Your Matches</h2>

      {matches.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--tg-hint)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💔</div>
          <p>No matches yet. Keep exploring!</p>
        </div>
      )}

      {matches.map(m => (
        <div key={m.id} className="list-item" onClick={() => navigate(`/chat/${m.id}`)}>
          <div className="avatar" style={{ background: 'color-mix(in srgb, var(--tg-button) 20%, var(--tg-section-bg))', color: 'var(--tg-button)' }}>
            {m.matched_user.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{m.matched_user.name}, {m.matched_user.age}</div>
            <div style={{ color: 'var(--tg-hint)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {Object.keys(m.matched_user.games).join(' · ')} · {m.matched_user.region.toUpperCase()}
            </div>
          </div>
          {m.has_active_chat && <span className="badge rank" style={{ whiteSpace: 'nowrap' }}>💬 Active</span>}
        </div>
      ))}
    </div>
  )
}

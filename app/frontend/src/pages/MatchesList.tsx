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
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getMatches().then(data => {
      setMatches(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = matches.filter(m =>
    m.matched_user.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 40 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 12 }} />
        ))}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      <div className="sticky-header" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Matches</h1>
          <button style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 16 }}>
            🔍
          </button>
        </div>
        <input
          className="input-field"
          placeholder="Search matches..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', fontSize: 14 }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--pink), var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20, opacity: 0.8,
          }}>
            {search ? '🔍' : '💔'}
          </div>
          <h3 style={{ fontSize: 20, marginBottom: 8, color: 'var(--foreground)' }}>
            {search ? 'Nothing found' : 'No matches yet'}
          </h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 280, lineHeight: 1.5 }}>
            {search ? 'Try a different search term' : 'Keep exploring Discover to find your duo!'}
          </p>
        </div>
      )}

      {filtered.map(m => (
        <div key={m.id}
          onClick={() => navigate(`/user/${m.matched_user.telegram_id}`, { state: { profile: m.matched_user } })}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--secondary)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ position: 'relative' }}>
            <div className={`avatar ${'md'}`}>
              <div>{m.matched_user.name.charAt(0).toUpperCase()}</div>
            </div>
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 10, height: 10, borderRadius: '50%',
              border: '2px solid var(--background)',
              background: 'var(--green)',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{m.matched_user.name}</span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="var(--gold)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {Object.keys(m.matched_user.games).join(' · ')} · {m.matched_user.region.toUpperCase()}
            </div>
          </div>

          {m.has_active_chat && (
            <span style={{
              borderRadius: 8, background: 'rgba(77,212,122,0.12)',
              color: 'var(--green)', padding: '2px 8px', fontSize: 11, fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              💬 Active
            </span>
          )}
        </div>
      ))}
    </main>
  )
}

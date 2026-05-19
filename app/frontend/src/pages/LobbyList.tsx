import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LobbyItem, GameInfo } from '../api/client'
import { impact } from '../utils/haptic'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function LobbyList({ user }: Props) {
  const navigate = useNavigate()
  const [lobbies, setLobbies] = useState<LobbyItem[]>([])
  const [games, setGames] = useState<GameInfo[]>([])
  const [selectedGame, setSelectedGame] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    api.getGames().then(data => setGames(data.games))
  }, [])

  const fetchLobbies = (game: string, q: string) => {
    setLoading(true)
    api.listLobbies(game, q).then(data => {
      setLobbies(data.lobbies)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchLobbies(selectedGame, search)
  }, [selectedGame])

  const handleSearch = (value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchLobbies(selectedGame, value), 300)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      <div className="sticky-header" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Lobbies</h1>
          <button onClick={() => { impact('medium'); navigate('/lobbies/create') }} style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>
            + Create
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button key="all" className={`chip ${selectedGame === '' ? 'active' : ''}`}
            onClick={() => { impact('light'); setSelectedGame('') }} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            All Games
          </button>
          {games.map(g => (
            <button key={g.key} className={`chip ${selectedGame === g.key ? 'active' : ''}`}
              onClick={() => { impact('light'); setSelectedGame(g.key) }} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {g.display}
            </button>
          ))}
        </div>
        <input className="input-field" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="🔍 Search lobbies..." style={{ borderRadius: 10, fontSize: 14 }} />
      </div>

      {loading ? (
        <div style={{ padding: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />
          ))}
        </div>
      ) : lobbies.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20, opacity: 0.8,
          }}>🎮</div>
          <h3 style={{ fontSize: 20, marginBottom: 8, color: 'var(--foreground)' }}>
            No open lobbies
          </h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 280, lineHeight: 1.5 }}>
            Create one and find your team!
          </p>
          <button onClick={() => { impact('medium'); navigate('/lobbies/create') }} style={{
            marginTop: 16, background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Create Lobby
          </button>
        </div>
      ) : (
        lobbies.map(lb => (
          <div key={lb.id} onClick={() => navigate(`/lobbies/${lb.id}`)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--secondary)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), var(--pink))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {(() => {
                const icons: Record<string, string> = { cs2: '🔫', dota2: '🗡️', valorant: '🔫', pubg: '🪖', overwatch: '🎯' }
                return icons[lb.game] || '🎮'
              })()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{lb.title}</div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: 13, display: 'flex', gap: 8 }}>
                <span>{lb.creator_name}</span>
                <span>·</span>
                <span>{lb.member_count}/{lb.max_players}</span>
                {!lb.is_public && <span>· 🔒</span>}
              </div>
            </div>
            {lb.member_count < lb.max_players && lb.status === 'open' ? (
              <span style={{
                borderRadius: 8, background: 'rgba(77,212,122,0.12)',
                color: 'var(--green)', padding: '2px 8px', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>Open</span>
            ) : (
              <span style={{
                borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                color: 'var(--muted-foreground)', padding: '2px 8px', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>{lb.member_count >= lb.max_players ? 'Full' : lb.status}</span>
            )}
          </div>
        ))
      )}
    </main>
  )
}

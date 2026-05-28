import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, GameInfo } from '../api/client'
import { impact } from '../utils/haptic'

const GAME_GRADIENTS: Record<string, string> = {
  cs2: 'linear-gradient(135deg, #f59e0b, #d97706)',
  dota2: 'linear-gradient(135deg, #22c55e, #166534)',
  valorant: 'linear-gradient(135deg, #ef4444, #991b1b)',
  overwatch: 'linear-gradient(135deg, #f97316, #ea580c)',
  apex: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
  lol: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
  fortnite: 'linear-gradient(135deg, #a855f7, #6b21a8)',
  rocket_league: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  pubg: 'linear-gradient(135deg, #eab308, #854d0e)',
}

function getGameLogoUrl(key: string): string {
  return `/games/${key}.svg`
}

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function LobbyCreate({ user }: Props) {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameInfo[]>([])
  const [game, setGame] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getGames().then(data => {
      setGames(data.games)
      if (data.games.length > 0) setGame(data.games[0].key)
    })
  }, [])

  const handleCreate = async () => {
    if (!game) { setError('Select a game'); return }
    if (!title.trim()) { setError('Enter a lobby title'); return }
    impact('medium')
    setSaving(true)
    setError('')
    try {
      const lobby = await api.createLobby({
        game,
        title: title.trim(),
        description: description.trim() || undefined,
        max_players: maxPlayers,
        is_public: isPublic,
      })
      navigate(`/lobbies/${lobby.id}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create lobby')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', padding: '24px 16px', paddingTop: 40, paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/lobbies')} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Create Lobby</h1>
      </div>

      {error && (
        <div style={{
          background: 'rgba(255,77,77,0.1)', color: '#ff4d4d',
          padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16,
        }}>{error}</div>
      )}

      {/* Game preview photo */}
      <div style={{
        width: '100%', height: 140, borderRadius: 14, marginBottom: 16,
        background: game ? (GAME_GRADIENTS[game] || 'linear-gradient(135deg, var(--primary), var(--pink))') : 'var(--secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
        boxShadow: game ? '0 4px 20px rgba(0,0,0,0.25)' : 'none',
        transition: 'all 0.3s',
      }}>
        {game && (
          <img src={getGameLogoUrl(game)} alt=""
            style={{ width: 64, height: 64, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          />
        )}
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {games.find(g => g.key === game)?.display || 'Select a game'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Game</label>
          <select value={game} onChange={e => setGame(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--secondary)', color: 'var(--foreground)', fontSize: 14,
              fontFamily: 'inherit',
            }}>
            {games.map(g => <option key={g.key} value={g.key}>{g.display}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Lobby Title</label>
          <input className="input-field" placeholder="e.g. Looking for duo" value={title}
            onChange={e => setTitle(e.target.value)} maxLength={60} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Description (optional)</label>
          <textarea className="input-field" placeholder="Rank, roles, requirements..."
            value={description} onChange={e => setDescription(e.target.value)}
            rows={3} style={{ resize: 'none', fontFamily: 'inherit' }} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Max Players</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[2, 3, 4, 5, 6].map(n => (
              <button key={n} className={`chip ${maxPlayers === n ? 'active' : ''}`}
                onClick={() => { impact('light'); setMaxPlayers(n) }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Room type</div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>
              {isPublic ? 'Anyone can join' : 'Creator approves each join'}
            </div>
          </div>
          <button onClick={() => { impact('light'); setIsPublic(!isPublic) }} style={{
            width: 48, height: 28, borderRadius: 14,
            background: isPublic ? 'var(--primary)' : 'var(--border)',
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#fff', position: 'absolute', top: 3,
              left: isPublic ? 24 : 3, transition: 'left 0.2s',
            }} />
          </button>
        </div>

        <button disabled={saving} onClick={handleCreate} style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: 'var(--primary)', color: '#fff', border: 'none',
          fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1, marginTop: 8,
        }}>
          {saving ? 'Creating...' : 'Create Lobby'}
        </button>
      </div>
    </main>
  )
}

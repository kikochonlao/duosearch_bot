import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Profile, GameInfo } from '../api/client'
import { impact } from '../utils/haptic'

const LANGUAGES = [
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'uk', label: 'Українська', flag: '🇺🇦' },
  { key: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { key: 'by', label: 'Беларуская', flag: '🇧🇾' },
  { key: 'uz', label: "O'zbek", flag: '🇺🇿' },
]

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function EditProfile({ user }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gamesData, setGamesData] = useState<GameInfo[]>([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [gender, setGender] = useState('M')
  const [languages, setLanguages] = useState<string[]>([])
  const [region, setRegion] = useState('cis')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [gameRanks, setGameRanks] = useState<Record<string, string>>({})
  const [gameRoles, setGameRoles] = useState<Record<string, string[]>>({})
  const [roleRanks, setRoleRanks] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    Promise.all([api.getProfile(), api.getGames()]).then(([p, g]) => {
      setProfile(p); setGamesData(g.games)
      setName(p.name); setAge(p.age); setGender(p.gender)
      setLanguages(p.language ? p.language.split(',') : ['ru']); setRegion(p.region)
      setPhotoUrl(p.photo_url)

      const gameKeys = Object.keys(p.games || {})
      setSelectedGames(gameKeys)
      const ranks: Record<string, string> = {}
      const roles: Record<string, string[]> = {}
      const perRole: Record<string, Record<string, string>> = {}
      for (const gk of gameKeys) {
        const gp = p.games[gk]
        ranks[gk] = gp.rank || ''
        const roleKeys = Object.keys(gp.roles || {})
        if (roleKeys.length > 0) {
          const gameDef = g.games.find((x: GameInfo) => x.key === gk)
          if (gameDef?.rank_per_role) {
            perRole[gk] = { ...gp.roles }
          } else {
            roles[gk] = roleKeys
            ranks[gk] = gp.rank || ''
          }
        }
      }
      setGameRanks(ranks)
      setGameRoles(roles)
      setRoleRanks(perRole)
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be under 2MB')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => setPhotoUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const buildGamesPayload = () => {
    const games: Record<string, { rank?: string; roles: Record<string, string> }> = {}
    for (const gk of selectedGames) {
      const game = gamesData.find(g => g.key === gk)
      if (!game) continue
      if (!game.has_roles) {
        games[gk] = { rank: gameRanks[gk] || '', roles: {} }
      } else if (game.rank_per_role) {
        games[gk] = { roles: roleRanks[gk] || {} }
      } else {
        const roles: Record<string, string> = {}
        for (const role of gameRoles[gk] || []) {
          roles[role] = gameRanks[gk] || ''
        }
        games[gk] = { rank: gameRanks[gk] || '', roles }
      }
    }
    return games
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateProfile({
        name, age: age as number, gender, language: languages.join(','), region,
        photo_url: photoUrl || undefined,
        games: buildGamesPayload(),
      })
      navigate('/profile')
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const toggleGame = (gk: string) => {
    impact('light')
    setSelectedGames(prev =>
      prev.includes(gk) ? prev.filter(k => k !== gk) : [...prev, gk]
    )
  }

  const renderGameRankPicker = (gameKey: string) => {
    const game = gamesData.find(g => g.key === gameKey)
    if (!game) return null

    if (!game.has_roles) {
      return (
        <div key={gameKey} style={{ marginTop: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Rank</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {game.ranks.map(r => (
              <button key={r} className={`chip ${gameRanks[gameKey] === r ? 'active' : ''}`}
                onClick={() => { impact('light'); setGameRanks(prev => ({ ...prev, [gameKey]: r })) }}>{r}</button>
            ))}
          </div>
        </div>
      )
    }

    if (!game.rank_per_role) {
      const selected = gameRoles[gameKey] || []
      return (
        <div key={gameKey} style={{ marginTop: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Roles</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {game.roles.map(r => (
              <button key={r} className={`chip ${selected.includes(r) ? 'active' : ''}`}
                onClick={() => setGameRoles(prev => ({
                  ...prev,
                  [gameKey]: selected.includes(r) ? selected.filter(x => x !== r) : [...selected, r],
                }))}>{r}</button>
            ))}
          </div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Rank</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {game.ranks.map(r => (
              <button key={r} className={`chip ${gameRanks[gameKey] === r ? 'active' : ''}`}
                onClick={() => { impact('light'); setGameRanks(prev => ({ ...prev, [gameKey]: r })) }}>{r}</button>
            ))}
          </div>
        </div>
      )
    }

    const rr = roleRanks[gameKey] || {}
    return (
      <div key={gameKey} style={{ marginTop: 8 }}>
        {game.roles.map(role => (
          <div key={role} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 4, display: 'block' }}>{role}</label>
            <select className="input-field" value={rr[role] || ''}
              onChange={e => setRoleRanks(prev => ({
                ...prev,
                [gameKey]: { ...prev[gameKey], [role]: e.target.value },
              }))}>
              <option value="">Select rank</option>
              {game.ranks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    )
  }

  if (!profile) return <div className="page"><div className="skeleton" style={{ height: 300 }} /></div>

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Edit Profile</h2>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(232,73,74,0.12)', border: '1px solid rgba(232,73,74,0.3)',
          color: 'var(--destructive)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Photo upload */}
        <div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Profile photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: photoUrl ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff',
              overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
              border: '2px solid var(--border)',
            }} onClick={() => fileInputRef.current?.click()}>
              {photoUrl ? (
                <img src={photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                name?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <div style={{ flex: 1 }}>
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--secondary)', color: 'var(--foreground)',
                  cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', width: '100%',
                }}>
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 6 }}>
                Tap to upload. Max 2MB.
              </p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>

        <div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Name</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Age</label>
          <input className="input-field" type="number" min={14} max={99} value={age === '' ? '' : age} onChange={e => { const v = e.target.value; setAge(v === '' ? '' : parseInt(v)) }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Gender</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['M', 'F'].map(g => {
              const active = gender === g; const male = g === 'M'
              return (
                <button key={g} className="chip" onClick={() => { impact('light'); setGender(g) }}
                  style={{
                    flex: 1, justifyContent: 'center',
                    borderColor: active ? (male ? 'var(--cyan)' : 'var(--pink)') : undefined,
                    background: active ? (male ? 'rgba(95,200,221,0.15)' : 'rgba(232,87,158,0.15)') : undefined,
                    color: active ? (male ? 'var(--cyan)' : 'var(--pink)') : undefined,
                  }}>
                  {male ? '♂️ Male' : '♀️ Female'}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Languages</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LANGUAGES.map(l => (
              <button key={l.key} className={`chip ${languages.includes(l.key) ? 'active' : ''}`}
                onClick={() => { impact('light'); setLanguages(prev => prev.includes(l.key) ? prev.filter(k => k !== l.key) : [...prev, l.key]) }}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          {languages.length > 0 && (
            <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 8 }}>
              {languages.length} language{languages.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Region</label>
          <select className="input-field" value={region} onChange={e => setRegion(e.target.value)}>
            {['cis', 'eu', 'na', 'asia', 'sa', 'oce'].map(r => (
              <option key={r} value={r}>{r.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Games section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        <label style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Games</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {gamesData.map(g => (
            <button key={g.key} className={`chip ${selectedGames.includes(g.key) ? 'active' : ''}`}
              onClick={() => toggleGame(g.key)}>
              {g.display}
            </button>
          ))}
        </div>
        {selectedGames.map(gk => renderGameRankPicker(gk))}
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 24 }}>
        {saving ? 'Saving...' : '💾 Save Changes'}
      </button>
    </div>
  )
}

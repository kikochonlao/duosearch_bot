import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Save } from 'lucide-react'
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
  const [blog, setBlog] = useState('')
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
      setBlog(p.blog || '')

      const gameKeys = Object.keys(p.games || {})
      setSelectedGames(gameKeys)
      const ranks: Record<string, string> = {}
      const roles: Record<string, string[]> = {}
      const perRole: Record<string, Record<string, string>> = {}
      for (const gk of gameKeys) {
        const gp = p.games[gk]
        ranks[gk] = gp.rank || ''
        const roleEntries = Object.entries(gp.roles || {})
        if (roleEntries.length > 0) {
          roles[gk] = roleEntries.map(([r]) => r)
          perRole[gk] = Object.fromEntries(roleEntries)
        }
      }
      setGameRanks(ranks)
      setGameRoles(roles)
      setRoleRanks(perRole)
    }).catch(() => setError('Failed to load profile'))
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
        const rrk = roleRanks[gk]
        const hasPerRole = rrk && Object.keys(rrk).length > 0
        const roles: Record<string, string> = {}
        for (const role of gameRoles[gk] || []) {
          roles[role] = (hasPerRole ? rrk[role] : gameRanks[gk]) || ''
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
        blog: blog || undefined,
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

  const renderRankChips = (gameKey: string, ranks: string[], value: string, onChange: (v: string) => void) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {ranks.map(r => (
        <button key={r}
          onClick={() => { impact('light'); onChange(r) }}
          style={{
            padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
            border: `1px solid ${value === r ? 'var(--primary)' : 'var(--border)'}`,
            background: value === r ? 'rgba(197,84,212,0.12)' : 'transparent',
            color: value === r ? 'var(--primary)' : 'var(--muted-foreground)',
            fontWeight: value === r ? 600 : 400,
            transition: 'all 0.1s',
          }}>{r}</button>
      ))}
    </div>
  )

  const renderGameRankPicker = (gameKey: string) => {
    const game = gamesData.find(g => g.key === gameKey)
    if (!game) return null

    if (!game.has_roles) {
      return (
        <div>
          <label style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Rank</label>
          {renderRankChips(gameKey, game.ranks, gameRanks[gameKey] || '', v => setGameRanks(prev => ({ ...prev, [gameKey]: v })))}
        </div>
      )
    }

    if (!game.rank_per_role) {
      const selected = gameRoles[gameKey] || []
      const rr = roleRanks[gameKey]
      const hasPerRole = rr && Object.keys(rr).length > 0

      if (hasPerRole) {
        const toggleRole = (role: string) => {
          if (selected.includes(role)) {
            setGameRoles(prev => ({ ...prev, [gameKey]: selected.filter(x => x !== role) }))
          } else {
            setGameRoles(prev => ({ ...prev, [gameKey]: [...selected, role] }))
            if (!rr[role]) {
              setRoleRanks(prev => ({
                ...prev,
                [gameKey]: { ...prev[gameKey], [role]: '' },
              }))
            }
          }
        }
        return (
          <div>
            <label style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Roles</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {game.roles.map(r => (
                <button key={r} className={`chip ${selected.includes(r) ? 'active' : ''}`}
                  onClick={() => toggleRole(r)}>{r}</button>
              ))}
            </div>
            {game.roles.filter(r => selected.includes(r)).map(role => (
              <div key={role} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 4, display: 'block' }}>{role}</label>
                <select className="input-field" value={rr[role] || ''}
                  onChange={e => setRoleRanks(prev => ({
                    ...prev,
                    [gameKey]: { ...prev[gameKey], [role]: e.target.value },
                  }))}
                  style={{ padding: '8px 10px', fontSize: 13 }}>
                  <option value="">Select rank</option>
                  {game.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            ))}
          </div>
        )
      }

      return (
        <div>
          <label style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Roles</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {game.roles.map(r => (
              <button key={r} className={`chip ${selected.includes(r) ? 'active' : ''}`}
                onClick={() => setGameRoles(prev => ({
                  ...prev,
                  [gameKey]: selected.includes(r) ? selected.filter(x => x !== r) : [...selected, r],
                }))}>{r}</button>
            ))}
          </div>
          <label style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Rank</label>
          {renderRankChips(gameKey, game.ranks, gameRanks[gameKey] || '', v => setGameRanks(prev => ({ ...prev, [gameKey]: v })))}
        </div>
      )
    }

    const rr = roleRanks[gameKey] || {}
    return (
      <div>
        {game.roles.map(role => (
          <div key={role} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 4, display: 'block' }}>{role}</label>
            <select className="input-field" value={rr[role] || ''}
              onChange={e => setRoleRanks(prev => ({
                ...prev,
                [gameKey]: { ...prev[gameKey], [role]: e.target.value },
              }))}
              style={{ padding: '8px 10px', fontSize: 13 }}>
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
                  {male ? '♂ Male' : '♀ Female'}
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

      {/* Blog */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        <label style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={16} /> Game blog</label>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4 }}>
          Write about your gaming experience, achievements, or what you're looking for
        </p>
        <textarea className="input-field" value={blog} onChange={e => setBlog(e.target.value)}
          placeholder="Tell your gaming story..."
          rows={4} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, fontSize: 14 }} />
      </div>

      {/* Games section */}
      <div style={{ marginTop: 20 }}>
        <label style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          Games
        </label>
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
          {gamesData.map(g => {
            const active = selectedGames.includes(g.key)
            return (
              <button key={g.key}
                onClick={() => toggleGame(g.key)}
                style={{
                  flex: '1 0 calc(50% - 4px)', minWidth: 0, maxWidth: '100%',
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  background: active ? 'rgba(197,84,212,0.1)' : 'var(--card)',
                  color: active ? 'var(--primary)' : 'var(--foreground)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13, textAlign: 'center', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <img src={`/games/${g.key}.svg`} alt=""
                  style={{ width: 16, height: 16, objectFit: 'contain' }}
                />
                {g.display}
              </button>
            )
          })}
        </div>
        {selectedGames.map(gk => {
          const game = gamesData.find(g => g.key === gk)
          if (!game) return null
          return (
            <div key={gk} style={{
              marginTop: 12, borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--card)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px', fontWeight: 600, fontSize: 14,
                borderBottom: '1px solid var(--border)',
                background: 'var(--secondary)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <img src={`/games/${gk}.svg`} alt=""
                  style={{ width: 20, height: 20, objectFit: 'contain' }}
                />
                {game.display}
              </div>
              <div style={{ padding: '12px 14px' }}>
                {renderGameRankPicker(gk)}
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 24 }}>
        {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
      </button>
    </div>
  )
}

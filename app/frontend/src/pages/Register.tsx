import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { api, GameInfo } from '../api/client'
import { impact } from '../utils/haptic'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
  onRegistered?: () => void
}

const REGIONS = [
  { key: 'cis', label: 'CIS', flag: '🌍' },
  { key: 'eu', label: 'Europe', flag: '🇪🇺' },
  { key: 'na', label: 'North America', flag: '🇺🇸' },
  { key: 'asia', label: 'Asia', flag: '🌏' },
  { key: 'sa', label: 'South America', flag: '🌎' },
  { key: 'oce', label: 'Oceania', flag: '🇦🇺' },
]

const LANGUAGES = [
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'uk', label: 'Українська', flag: '🇺🇦' },
  { key: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { key: 'by', label: 'Беларуская', flag: '🇧🇾' },
  { key: 'uz', label: "O'zbek", flag: '🇺🇿' },
]

export default function Register({ user, onRegistered }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [gamesData, setGamesData] = useState<GameInfo[]>([])
  const [name, setName] = useState(user?.username || '')
  const [age, setAge] = useState<number | ''>('')
  const [gender, setGender] = useState('M')
  const [bio, setBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [region, setRegion] = useState('cis')
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [gameRanks, setGameRanks] = useState<Record<string, string>>({})
  const [gameRoles, setGameRoles] = useState<Record<string, string[]>>({})
  const [roleRanks, setRoleRanks] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getGames().then(data => setGamesData(data.games)).catch(() => setError('Failed to load games'))
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

  const validateStep = (): boolean => {
    setError('')
    if (step === 0) {
      if (!name.trim()) { setError('Please enter your name'); return false }
      if (age === '' || age < 14 || age > 99) { setError('Age must be between 14 and 99'); return false }
      return true
    }
    if (step === 1) {
      if (languages.length === 0) { setError('Select at least one language'); return false }
      return true
    }
    if (step === 2) {
      if (selectedGames.length === 0) { setError('Select at least one game'); return false }
      return true
    }
    if (step >= 3) {
      const gameKey = selectedGames[step - 3]
      const game = gamesData.find(g => g.key === gameKey)
      if (game && !game.has_roles && !gameRanks[gameKey]) {
        setError('Please select a rank')
        return false
      }
      if (game && game.has_roles && !game.rank_per_role && !gameRanks[gameKey]) {
        setError('Please select a rank')
        return false
      }
      if (game && game.rank_per_role) {
        const rr = roleRanks[gameKey] || {}
        const missing = game.roles.filter(r => !rr[r])
        if (missing.length > 0) {
          setError(`Select rank for: ${missing.join(', ')}`)
          return false
        }
      }
      return true
    }
    return true
  }

  const handleNext = async () => {
    if (!validateStep()) return
    const totalSteps = 3 + selectedGames.length
    if (step >= totalSteps - 1) {
      setSaving(true)
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
      try {
        await api.createProfile({ name, age: age as number, gender, language: languages.join(','), region, bio: bio || undefined, photo_url: photoUrl || undefined, games })
        onRegistered?.()
        navigate('/discover', { replace: true })
      } catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : typeof e === 'string' ? e : 'Failed to save profile. Check all fields.'
        setError(msg)
      } finally { setSaving(false) }
    } else {
      setStep(s => s + 1)
    }
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Photo upload */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Profile photo</label>
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

          {/* Name */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Your name *</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
          </div>

          {/* Age */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Age</label>
            <input className="input-field" type="number" min={14} max={99} value={age === '' ? '' : age} onChange={e => { const v = e.target.value; setAge(v === '' ? '' : parseInt(v)) }} />
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Gender</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['M', 'F'].map(g => {
                const active = gender === g; const male = g === 'M'
                return (
                  <button key={g} className="chip"
                    onClick={() => { impact('light'); setGender(g) }}
                    style={{
                      flex: 1, justifyContent: 'center', padding: '12px 0',
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

          {/* Bio */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>About you</label>
            <textarea className="input-field" value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell others about yourself, your playstyle, what you're looking for..."
              rows={3} style={{ resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
        </div>
      )
    }
    if (step === 1) {
      return (
        <div>
          <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Languages you speak</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {LANGUAGES.map(l => (
              <button key={l.key} className={`chip ${languages.includes(l.key) ? 'active' : ''}`}
                onClick={() => { impact('light'); setLanguages(prev => prev.includes(l.key) ? prev.filter(k => k !== l.key) : [...prev, l.key]) }}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          {languages.length > 0 && (
            <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: -12, marginBottom: 24 }}>
              {languages.length} language{languages.length !== 1 ? 's' : ''} selected
            </p>
          )}
          <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Region</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REGIONS.map(r => (
              <button key={r.key} className={`chip ${region === r.key ? 'active' : ''}`}
                onClick={() => { impact('light'); setRegion(r.key) }}>
                {r.flag} {r.label}
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (step === 2) {
      return (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {gamesData.map(g => (
              <button key={g.key} className={`chip ${selectedGames.includes(g.key) ? 'active' : ''}`}
                onClick={() => { impact('light'); setSelectedGames(prev => prev.includes(g.key) ? prev.filter(k => k !== g.key) : [...prev, g.key]) }}>
                {g.display}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 12 }}>
            {selectedGames.length} game{selectedGames.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )
    }

    const gameIdx = step - 3
    const gameKey = selectedGames[gameIdx]
    const game = gamesData.find(g => g.key === gameKey)
    if (!game) return <p style={{ color: 'var(--muted-foreground)' }}>Loading game data...</p>

    if (!game.has_roles) {
      return (
        <div>
          <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Rank - {game.display}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {game.ranks.map(r => (
              <button key={r} className={`chip ${gameRanks[gameKey] === r ? 'active' : ''}`}
                onClick={() => setGameRanks(prev => ({ ...prev, [gameKey]: r }))}>{r}</button>
            ))}
          </div>
        </div>
      )
    }

    if (!game.rank_per_role) {
      const selected = gameRoles[gameKey] || []
      return (
        <>
          <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Roles - {game.display}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {game.roles.map(r => (
              <button key={r} className={`chip ${selected.includes(r) ? 'active' : ''}`}
                onClick={() => setGameRoles(prev => ({
                  ...prev,
                  [gameKey]: selected.includes(r) ? selected.filter(x => x !== r) : [...selected, r],
                }))}>{r}</button>
            ))}
          </div>
          <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8, display: 'block' }}>Rank</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {game.ranks.map(r => (
              <button key={r} className={`chip ${gameRanks[gameKey] === r ? 'active' : ''}`}
                onClick={() => setGameRanks(prev => ({ ...prev, [gameKey]: r }))}>{r}</button>
            ))}
          </div>
        </>
      )
    }

    const rr = roleRanks[gameKey] || {}
    return (
      <>
        {game.roles.map(role => (
          <div key={role} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>{role}</label>
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
      </>
    )
  }

  const totalSteps = 3 + selectedGames.length
  const isLast = step >= totalSteps - 1

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="sticky-header">
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Create Profile</h1>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          Step {step + 1}/{totalSteps}
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2, transition: 'all 0.3s',
              background: i <= step ? 'var(--primary)' : 'var(--border)',
              opacity: i <= step ? 1 : 0.4,
            }} />
          ))}
        </div>

        {/* Step title */}
        {step === 0 && <><h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Tell us about yourself</h2><p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 28 }}>Let's start with the basics</p></>}
        {step === 1 && <><h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Language & Region</h2><p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 28 }}>Help us find people near you</p></>}
        {step === 2 && <><h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Choose your games</h2><p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 28 }}>Select at least one game</p></>}
        {step >= 3 && (() => {
          const g = gamesData.find(x => x.key === selectedGames[step - 3])
          return g ? <><h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={`/games/${g.key}.svg`} alt=""
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            {g.display}
          </h2><p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 28 }}>Set your rank and roles</p></> : null
        })()}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(232,73,74,0.12)', border: '1px solid rgba(232,73,74,0.3)',
            color: 'var(--destructive)', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, animation: 'fadeIn 0.3s ease-out' }}>
          {renderStep()}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {step > 0 && (
            <button className="btn-secondary" onClick={() => { impact('light'); setStep(s => s - 1) }}
              style={{ flex: 0.3, padding: 14 }}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <button className="btn-primary" onClick={() => { impact('medium'); handleNext() }} disabled={saving}
            style={{ flex: 1, padding: 14 }}>
            {saving ? 'Saving...' : isLast ? 'Complete Profile' : <>Continue <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </main>
  )
}

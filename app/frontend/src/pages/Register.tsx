import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, GameInfo } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
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

export default function Register({ user }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [gamesData, setGamesData] = useState<GameInfo[]>([])
  const [profile, setProfile] = useState({
    name: user?.username || '',
    age: 18,
    gender: 'M' as string,
    language: 'ru',
    region: 'cis',
    games: {} as Record<string, { rank?: string; roles: Record<string, string> }>,
  })
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [currentGameIdx, setCurrentGameIdx] = useState(0)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [roleRanks, setRoleRanks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getGames().then(data => setGamesData(data.games))
  }, [])

  const currentGame = gamesData.find(g => g.key === selectedGames[currentGameIdx])

  const handleNext = async () => {
    if (step >= steps.length - 1) {
      setSaving(true)
      try {
        await api.createProfile({
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          language: profile.language || 'ru',
          region: profile.region,
          games: profile.games,
        })
        navigate('/discover')
      } catch (e: any) {
        alert(e.message)
      } finally { setSaving(false) }
    } else {
      setStep(s => s + 1)
    }
  }

  const steps: { title: string; subtitle: string; render: () => JSX.Element }[] = [
    {
      title: 'Tell us about yourself',
      subtitle: 'Let\'s start with the basics',
      render: () => (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Your name</label>
            <input className="input-field" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Enter your name" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Age</label>
            <input className="input-field" type="number" min={14} max={99} value={profile.age} onChange={e => setProfile(p => ({ ...p, age: parseInt(e.target.value) || 14 }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Gender</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['M', 'F'].map(g => (
                <button key={g} className={`chip ${profile.gender === g ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, gender: g }))}
                  style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}>
                  {g === 'M' ? '♂️ Male' : '♀️ Female'}
                </button>
              ))}
            </div>
          </div>
        </>
      ),
    },
    {
      title: 'Language & Region',
      subtitle: 'Help us find people near you',
      render: () => (
        <>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Languages you speak</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
            {LANGUAGES.map(l => (
              <button key={l.key} className={`chip ${profile.language === l.key ? 'active' : ''}`}
                onClick={() => setProfile(p => ({ ...p, language: l.key }))}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Region</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REGIONS.map(r => (
              <button key={r.key} className={`chip ${profile.region === r.key ? 'active' : ''}`}
                onClick={() => setProfile(p => ({ ...p, region: r.key }))}>
                {r.flag} {r.label}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Choose your games',
      subtitle: 'Select at least one game',
      render: () => (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {gamesData.map(g => (
              <button key={g.key} className={`chip ${selectedGames.includes(g.key) ? 'active' : ''}`}
                onClick={() => setSelectedGames(prev => prev.includes(g.key) ? prev.filter(k => k !== g.key) : [...prev, g.key])}>
                {g.display}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--tg-hint)', fontSize: 13, marginTop: 12 }}>
            {selectedGames.length} game{selectedGames.length !== 1 ? 's' : ''} selected
          </p>
        </>
      ),
    },
    ...selectedGames.map((gameKey, idx) => {
      const game = gamesData.find(g => g.key === gameKey)
      if (!game) return { title: '', subtitle: '', render: () => null }
      return {
        title: `${game.display}`,
        subtitle: 'Set your rank and roles',
        render: () => {
          const gp = profile.games[gameKey] || { roles: {} }
          if (!game.has_roles) {
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {game.ranks.map(r => (
                  <button key={r} className={`chip ${gp.rank === r ? 'active' : ''}`}
                    onClick={() => setProfile(p => ({ ...p, games: { ...p.games, [gameKey]: { ...gp, rank: r } } }))}>
                    {r}
                  </button>
                ))}
              </div>
            )
          }
          if (!game.rank_per_role) {
            return (
              <>
                <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {game.roles.map(r => (
                    <button key={r} className={`chip ${selectedRoles.includes(r) ? 'active' : ''}`}
                      onClick={() => setSelectedRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}>
                      {r}
                    </button>
                  ))}
                </div>
                <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, display: 'block' }}>Rank</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {game.ranks.map(r => (
                    <button key={r} className={`chip ${gp.rank === r ? 'active' : ''}`}
                      onClick={() => {
                        setProfile(p => ({ ...p, games: { ...p.games, [gameKey]: { rank: r, roles: Object.fromEntries(selectedRoles.map(sr => [sr, r])) } } }))
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )
          }
          return (
            <>
              {game.roles.map(role => (
                <div key={role} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>{role}</label>
                  <select className="input-field" value={roleRanks[role] || ''} onChange={e => {
                    const rr = { ...roleRanks, [role]: e.target.value }
                    setRoleRanks(rr)
                    setProfile(p => ({ ...p, games: { ...p.games, [gameKey]: { rank: '', roles: rr } } }))
                  }}>
                    <option value="">Select rank</option>
                    {game.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </>
          )
        }
      }
    }).filter(Boolean) as { title: string; subtitle: string; render: () => JSX.Element }[],
  ]

  const isLast = step >= steps.length - 1

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2, transition: 'all 0.3s',
            background: i <= step ? 'var(--tg-button)' : 'var(--tg-border)',
            opacity: i <= step ? 1 : 0.4,
          }} />
        ))}
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{steps[step]?.title}</h2>
      <p style={{ color: 'var(--tg-hint)', fontSize: 14, marginBottom: 24 }}>{steps[step]?.subtitle}</p>

      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {steps[step]?.render()}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        {step > 0 && (
          <button className="btn-secondary" onClick={() => setStep(s => s - 1)} style={{ flex: step > 0 ? 0.3 : 0 }}>
            ← Back
          </button>
        )}
        <button className="btn-primary" onClick={handleNext} disabled={saving}
          style={{ flex: 1 }}>
          {saving ? 'Saving...' : isLast ? '🎉 Complete' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

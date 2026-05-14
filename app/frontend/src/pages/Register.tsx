import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, GameInfo } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

const REGIONS = [
  { key: 'cis', label: 'CIS' },
  { key: 'eu', label: 'Europe' },
  { key: 'na', label: 'North America' },
  { key: 'asia', label: 'Asia' },
  { key: 'sa', label: 'South America' },
  { key: 'oce', label: 'Oceania' },
]

const LANGUAGES = [
  { key: 'ru', label: 'Русский' },
  { key: 'en', label: 'English' },
  { key: 'uk', label: 'Українська' },
  { key: 'kz', label: 'Қазақша' },
  { key: 'by', label: 'Беларуская' },
  { key: 'uz', label: "O'zbek" },
]

export default function Register({ user }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [gamesData, setGamesData] = useState<GameInfo[]>([])
  const [profile, setProfile] = useState({
    username: user?.username || '',
    name: '',
    age: 18,
    gender: 'M',
    language: 'ru',
    region: 'cis',
    looking_for: 'any',
    games: {} as Record<string, { rank?: string; roles: Record<string, string> }>,
  })
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [currentGameIdx, setCurrentGameIdx] = useState(0)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedRank, setSelectedRank] = useState('')
  const [roleRanks, setRoleRanks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getGames().then(data => setGamesData(data.games))
  }, [])

  const currentGame = gamesData.find(g => g.key === selectedGames[currentGameIdx])

  const steps = [
    // 0: Name & Age & Gender
    {
      title: 'Tell us about yourself',
      render: () => (
        <>
          <Input label="Your name" value={profile.name} onChange={v => setProfile(p => ({ ...p, name: v }))} placeholder="Enter your name" />
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Age</label>
            <input type="number" min={14} max={99} value={profile.age}
              onChange={e => setProfile(p => ({ ...p, age: parseInt(e.target.value) || 14 }))}
              style={inputStyle} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Gender</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip selected={profile.gender === 'M'} onClick={() => setProfile(p => ({ ...p, gender: 'M' }))}>Male</Chip>
              <Chip selected={profile.gender === 'F'} onClick={() => setProfile(p => ({ ...p, gender: 'F' }))}>Female</Chip>
            </div>
          </div>
        </>
      ),
    },
    // 1: Language & Region
    {
      title: 'Language & Region',
      render: () => (
        <>
          <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '8px', display: 'block' }}>Languages you speak</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {LANGUAGES.map(l => (
              <Chip key={l.key} selected={profile.language.includes(l.key)}
                onClick={() => setProfile(p => ({ ...p, language: p.language === l.key ? '' : l.key }))}>
                {l.label}
              </Chip>
            ))}
          </div>

          <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '8px', display: 'block' }}>Region</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REGIONS.map(r => (
              <Chip key={r.key} selected={profile.region === r.key}
                onClick={() => setProfile(p => ({ ...p, region: r.key }))}>
                {r.label}
              </Chip>
            ))}
          </div>
        </>
      ),
    },
    // 2: Select games
    {
      title: 'Choose your games',
      render: () => (
        <>
          <p style={{ color: '#8e9eab', fontSize: '14px', marginBottom: '12px' }}>
            Select at least one game you play
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {gamesData.map(g => (
              <Chip key={g.key} selected={selectedGames.includes(g.key)}
                onClick={() => {
                  setSelectedGames(prev =>
                    prev.includes(g.key) ? prev.filter(k => k !== g.key) : [...prev, g.key]
                  )
                }}>
                {g.display}
              </Chip>
            ))}
          </div>
        </>
      ),
    },
    // 3+: Game-specific (roles, ranks)
    ...(selectedGames.map((gameKey, idx) => {
      const game = gamesData.find(g => g.key === gameKey)
      if (!game) return null
      return {
        title: `${game.display} — Rank & Roles`,
        render: () => {
          if (!game.has_roles) {
            return (
              <>
                <p style={{ color: '#8e9eab', fontSize: '14px', marginBottom: '12px' }}>
                  Select your rank in {game.display}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {game.ranks.map(r => (
                    <Chip key={r} selected={profile.games[gameKey]?.rank === r}
                      onClick={() => setProfile(p => ({
                        ...p, games: { ...p.games, [gameKey]: { ...p.games[gameKey], rank: r } }
                      }))}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </>
            )
          }

          if (!game.rank_per_role) {
            return (
              <>
                <p style={{ color: '#8e9eab', fontSize: '14px', marginBottom: '8px' }}>
                  Select your roles in {game.display}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {game.roles.map(r => (
                    <Chip key={r} selected={selectedRoles.includes(r)}
                      onClick={() => setSelectedRoles(prev =>
                        prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                      )}>
                      {r}
                    </Chip>
                  ))}
                </div>
                <p style={{ color: '#8e9eab', fontSize: '14px', marginBottom: '8px' }}>
                  Your rank (applies to all roles)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {game.ranks.map(r => (
                    <Chip key={r} selected={profile.games[gameKey]?.rank === r}
                      onClick={() => setProfile(p => ({
                        ...p, games: { ...p.games, [gameKey]: { ...p.games[gameKey], rank: r, roles: Object.fromEntries(selectedRoles.map(sr => [sr, r])) } }
                      }))}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </>
            )
          }

          return (
            <>
              <p style={{ color: '#8e9eab', fontSize: '14px', marginBottom: '8px' }}>
                Select roles and ranks in {game.display}
              </p>
              {game.roles.map(role => (
                <div key={role} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>{role}</label>
                  <select value={roleRanks[role] || ''} onChange={e => {
                    const newRR = { ...roleRanks, [role]: e.target.value }
                    setRoleRanks(newRR)
                    setProfile(p => ({
                      ...p, games: { ...p.games, [gameKey]: { ...p.games[gameKey], roles: newRR, rank: '' } }
                    }))
                  }} style={{ ...inputStyle, marginBottom: 0 }}>
                    <option value="">Select rank</option>
                    {game.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </>
          )
        }
      }
    }).filter(Boolean)),
  ]

  const validSteps = steps.filter(Boolean) as { title: string; render: () => JSX.Element }[]
  const isLastStep = step >= validSteps.length - 1

  const handleNext = async () => {
    if (isLastStep) {
      setSaving(true)
      try {
        await api.createProfile({
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          language: profile.language || 'ru',
          region: profile.region,
          looking_for: profile.looking_for,
          games: profile.games,
        })
        navigate('/discover')
      } catch (e: any) {
        alert(e.message)
      } finally {
        setSaving(false)
      }
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {validSteps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= step ? '#2ea6ff' : '#2b3b4a',
          }} />
        ))}
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
        {validSteps[step]?.title}
      </h2>

      {validSteps[step]?.render()}

      <button onClick={handleNext} disabled={saving} style={{
        ...btnStyle, marginTop: 32, opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Saving...' : isLastStep ? 'Complete' : 'Next'}
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #2b3b4a',
  backgroundColor: '#1f2a36', color: '#fff', fontSize: '16px', outline: 'none',
}

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  backgroundColor: '#2ea6ff', color: '#fff', fontSize: '17px', fontWeight: 600, cursor: 'pointer',
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: '20px', border: selected ? '2px solid #2ea6ff' : '1px solid #2b3b4a',
      backgroundColor: selected ? 'rgba(46,166,255,0.15)' : 'transparent',
      color: selected ? '#2ea6ff' : '#8e9eab', fontSize: '13px', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

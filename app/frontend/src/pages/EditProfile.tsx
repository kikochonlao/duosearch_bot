import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Profile, GameInfo } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function EditProfile({ user }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [games, setGames] = useState<GameInfo[]>([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [gender, setGender] = useState('M')
  const [language, setLanguage] = useState('ru')
  const [region, setRegion] = useState('cis')

  useEffect(() => {
    Promise.all([api.getProfile(), api.getGames()]).then(([p, g]) => {
      setProfile(p); setGames(g.games)
      setName(p.name); setAge(p.age); setGender(p.gender)
      setLanguage(p.language); setRegion(p.region)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateProfile({ name, age: age as number, gender, language, region })
      navigate('/profile')
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  if (!profile) return <div className="page"><div className="skeleton" style={{ height: 300 }} /></div>

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Edit Profile</h2>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <button key={g} className="chip" onClick={() => setGender(g)}
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
          <label style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 6, display: 'block' }}>Language</label>
          <input className="input-field" value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g. ru,en" />
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

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 24 }}>
        {saving ? 'Saving...' : '💾 Save Changes'}
      </button>
    </div>
  )
}

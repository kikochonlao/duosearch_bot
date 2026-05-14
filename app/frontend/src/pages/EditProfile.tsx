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
  const [age, setAge] = useState(18)
  const [gender, setGender] = useState('M')
  const [language, setLanguage] = useState('ru')
  const [region, setRegion] = useState('cis')

  useEffect(() => {
    Promise.all([api.getProfile(), api.getGames()]).then(([p, g]) => {
      setProfile(p)
      setGames(g.games)
      setName(p.name)
      setAge(p.age)
      setGender(p.gender)
      setLanguage(p.language)
      setRegion(p.region)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateProfile({ name, age, gender, language, region })
      navigate('/profile')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div style={{ textAlign: 'center', paddingTop: '40vh', color: '#8e9eab' }}>Loading...</div>

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Edit Profile</h2>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Age</label>
        <input type="number" min={14} max={99} value={age} onChange={e => setAge(parseInt(e.target.value) || 14)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Gender</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setGender('M')}
            style={{ padding: '8px 20px', borderRadius: '20px', border: gender === 'M' ? '2px solid #2ea6ff' : '1px solid #2b3b4a', backgroundColor: gender === 'M' ? 'rgba(46,166,255,0.15)' : 'transparent', color: gender === 'M' ? '#2ea6ff' : '#8e9eab', cursor: 'pointer' }}>
            Male
          </button>
          <button onClick={() => setGender('F')}
            style={{ padding: '8px 20px', borderRadius: '20px', border: gender === 'F' ? '2px solid #2ea6ff' : '1px solid #2b3b4a', backgroundColor: gender === 'F' ? 'rgba(46,166,255,0.15)' : 'transparent', color: gender === 'F' ? '#2ea6ff' : '#8e9eab', cursor: 'pointer' }}>
            Female
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Language</label>
        <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g. ru,en" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '13px', color: '#8e9eab', marginBottom: '4px', display: 'block' }}>Region</label>
        <select value={region} onChange={e => setRegion(e.target.value)} style={inputStyle}>
          <option value="cis">CIS</option>
          <option value="eu">Europe</option>
          <option value="na">North America</option>
          <option value="asia">Asia</option>
          <option value="sa">South America</option>
          <option value="oce">Oceania</option>
        </select>
      </div>

      <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving...' : 'Save Changes'}
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

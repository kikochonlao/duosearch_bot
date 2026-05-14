import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Profile, GameInfo } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function ProfilePage({ user }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getProfile(),
      api.getGames(),
    ]).then(([p, g]) => {
      setProfile(p)
      setGames(g.games)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh', color: '#8e9eab' }}>Loading profile...</div>
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '30vh' }}>
        <p style={{ color: '#8e9eab', marginBottom: 16 }}>Profile not found. Please register first.</p>
        <button onClick={() => navigate('/register')}
          style={{ ...btnStyle, maxWidth: '200px', margin: '0 auto' }}>Register</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', backgroundColor: '#2b3b4a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', margin: '0 auto 12px',
        }}>
          {profile.name[0].toUpperCase()}
        </div>
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{profile.name}, {profile.age}</h2>
        <p style={{ color: '#8e9eab', fontSize: '14px' }}>
          {profile.gender === 'M' ? 'Male' : 'Female'} · {profile.language} · {profile.region.toUpperCase()}
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#8e9eab' }}>Games</h3>
        {Object.entries(profile.games).map(([gk, gp]) => {
          const gInfo = games.find(g => g.key === gk)
          return (
            <div key={gk} style={{
              backgroundColor: '#1f2a36', borderRadius: '12px', padding: '12px 16px',
              marginBottom: 8,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{gInfo?.display || gk}</div>
              {gp.rank && <div style={{ color: '#8e9eab', fontSize: '13px' }}>Rank: {gp.rank}</div>}
              {Object.entries(gp.roles).length > 0 && (
                <div style={{ color: '#8e9eab', fontSize: '13px' }}>
                  Roles: {Object.entries(gp.roles).map(([r, rk]) => `${r} (${rk})`).join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={() => navigate('/profile/edit')} style={btnStyle}>
        Edit Profile
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  backgroundColor: '#2ea6ff', color: '#fff', fontSize: '17px', fontWeight: 600, cursor: 'pointer',
}

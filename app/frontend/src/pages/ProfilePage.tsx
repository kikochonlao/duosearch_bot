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
    Promise.all([api.getProfile(), api.getGames()]).then(([p, g]) => {
      setProfile(p)
      setGames(g.games)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="page"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
  }

  if (!profile) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '30vh' }}>
        <p style={{ color: 'var(--tg-hint)', marginBottom: 16 }}>Please register first</p>
        <button className="btn-primary" onClick={() => navigate('/register')} style={{ maxWidth: 200, margin: '0 auto' }}>
          Register
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div className="avatar lg" style={{ margin: '0 auto 12px', background: 'color-mix(in srgb, var(--tg-button) 20%, var(--tg-section-bg))', color: 'var(--tg-button)' }}>
          {profile.name[0].toUpperCase()}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{profile.name}, {profile.age}</h2>
        <p style={{ color: 'var(--tg-hint)', fontSize: 14, marginTop: 4 }}>
          {profile.gender === 'M' ? '♂️ Male' : '♀️ Female'} · {profile.language} · {profile.region.toUpperCase()}
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <p className="section-title">Games</p>
        {Object.entries(profile.games).map(([gk, gp]) => {
          const gInfo = games.find(g => g.key === gk)
          return (
            <div key={gk} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{gInfo?.display || gk}</span>
                {gp.rank && <span className="badge rank">{gp.rank}</span>}
              </div>
              {Object.entries(gp.roles).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {Object.entries(gp.roles).map(([role, rank]) => (
                    <span key={role} className="badge game">{role}: {rank}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="btn-primary" onClick={() => navigate('/profile/edit')} style={{ marginTop: 20 }}>
        ✏️ Edit Profile
      </button>
    </div>
  )
}

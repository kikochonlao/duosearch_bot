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
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </main>
    )
  }

  if (!profile) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--background)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, textAlign: 'center',
      }}>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: 16 }}>Please register first</p>
        <button className="btn-primary" onClick={() => navigate('/register')} style={{ maxWidth: 200, padding: 14 }}>
          Register
        </button>
      </main>
    )
  }

  const stats = {
    matches: Object.keys(profile.games).length.toString(),
    duos: '0',
    streak: 'New',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      <div className="sticky-header">
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Profile</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/profile/edit')}
            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 18 }}>
            ⚙️
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
        <div style={{ position: 'relative' }}>
          <div className="avatar xl">
            <div>
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.innerText = profile.name.charAt(0).toUpperCase()) }} />
              ) : profile.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <button onClick={() => navigate('/profile/edit')} style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid var(--card)',
            background: 'var(--secondary)', color: 'var(--foreground)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            ✏️
          </button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 16 }}>{profile.name}</h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4,
        }}>
          <span>{profile.age}</span>
          <span>•</span>
          <span>{profile.region.toUpperCase()}</span>
          <span>•</span>
          <span style={{
            borderRadius: 8, background: 'rgba(197,84,212,0.12)',
            color: 'var(--primary)', padding: '2px 8px', fontSize: 11, fontWeight: 500,
          }}>
            {profile.gender === 'M' ? '♂️ Male' : '♀️ Female'}
          </span>
        </div>

        <button onClick={() => navigate('/profile/edit')}
          className="btn-secondary"
          style={{ marginTop: 16, padding: '10px 24px', width: 'auto', fontSize: 14 }}>
          ✏️ Edit Profile
        </button>
      </div>

      {/* Stats */}
      <div style={{
        margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, borderRadius: 12, border: '1px solid var(--border)',
        background: 'var(--card)', padding: 16,
      }}>
        {[
          { value: stats.matches, label: 'Matches' },
          { value: stats.duos, label: 'Duos' },
          { value: stats.streak, label: 'Streak' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* About me */}
      <section style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>About me</h3>
          <button onClick={() => navigate('/profile/edit')}
            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 13 }}>
            Edit
          </button>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)' }}>
          {profile.bio || 'Looking for teammates to play with'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', fontSize: 14 }}>
            <span>📍</span>
            <span>Region: {profile.region.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', fontSize: 14 }}>
            <span>🗣️</span>
            <span>Language: {profile.language}</span>
          </div>
        </div>
      </section>

      {/* Games */}
      <section style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Games</h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(profile.games).map(([gk, gp]) => {
            const gi = games.find(g => g.key === gk)
            return (
              <span key={gk} className="chip active" style={{ cursor: 'default' }}>
                {gi?.display || gk}
                {gp.rank && <span style={{ color: 'var(--gold)', marginLeft: 4 }}>{gp.rank}</span>}
              </span>
            )
          })}
        </div>
        {Object.entries(profile.games).map(([gk, gp]) => {
          const gi = games.find(g => g.key === gk)
          if (!Object.keys(gp.roles).length) return null
          return (
            <div key={gk} style={{ marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{gi?.display || gk} roles:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {Object.entries(gp.roles).map(([role, rank]) => (
                  <span key={role} className="badge game" style={{ fontSize: 11 }}>{role}: {rank}</span>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </main>
  )
}

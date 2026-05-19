import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api, Profile, GameInfo } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function UserProfile({ user }: Props) {
  const { telegramId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<Profile | null>(location.state?.profile as Profile | null)
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(!profile)

  useEffect(() => {
    if (profile) {
      api.getGames().then(data => setGames(data.games)).catch(() => {})
      return
    }
    if (!telegramId) return
    Promise.all([
      api.getUserProfile(parseInt(telegramId)),
      api.getGames(),
    ]).then(([p, g]) => {
      setProfile(p)
      setGames(g.games)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [telegramId])

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
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <p style={{ color: 'var(--muted-foreground)' }}>User not found</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      <div className="sticky-header">
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Profile</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
        <div className="avatar xl">
          <div>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.innerText = profile.name.charAt(0).toUpperCase()) }} />
            ) : profile.name.charAt(0).toUpperCase()}
          </div>
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
      </div>

      {profile.bio && (
        <section style={{ padding: '0 16px 24px' }}>
          <h3 className="section-title" style={{ marginBottom: 8 }}>About</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)' }}>
            {profile.bio}
          </p>
        </section>
      )}

      {profile.blog && (
        <section style={{ padding: '0 16px 24px' }}>
          <h3 className="section-title" style={{ marginBottom: 8 }}>📝 Blog</h3>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}>
            {profile.blog}
          </div>
        </section>
      )}

      <section style={{ padding: '0 16px 24px' }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Games</h3>
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
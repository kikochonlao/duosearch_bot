import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { FileText, Heart, Gamepad2, MapPin, Sparkles, MessageCircle } from 'lucide-react'
import { api, Profile, GameInfo, MatchItem } from '../api/client'
import { impact } from '../utils/haptic'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}



export default function UserProfile({ user }: Props) {
  const { telegramId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<Profile | null>(location.state?.profile as Profile | null)
  const [games, setGames] = useState<GameInfo[]>([])
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(!profile)

  useEffect(() => {
    if (!telegramId) return
    Promise.all([
      profile ? Promise.resolve(profile) : api.getUserProfile(parseInt(telegramId)),
      api.getGames(),
      api.getMatches(),
    ]).then(([p, g, m]) => {
      setProfile(p)
      setGames(g.games)
      setMatches(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [telegramId])

  const myMatch = profile && matches.find(m => m.matched_user.telegram_id === profile.telegram_id)

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 0 }} />
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

  const displayGames = games.filter(g => g.key in profile.games)
  const profileGames = profile.games || {}

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      {/* Header with gradient background */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1230 0%, #2a1a45 40%, #1e2a4a 100%)',
        padding: '32px 20px 24px', textAlign: 'center', position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(197,84,212,0.12), transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,130,255,0.08), transparent)',
        }} />

        {/* Avatar */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))', padding: 3,
          boxShadow: '0 0 40px rgba(197,84,212,0.3)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--background)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontWeight: 700, color: 'var(--foreground)',
          }}>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.innerText = profile.name.charAt(0).toUpperCase()) }} />
            ) : profile.name.charAt(0).toUpperCase()}
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700 }}>{profile.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, color: 'var(--muted-foreground)', fontSize: 14 }}>
          <span>{profile.age} years</span>
          <span>•</span>
          <MapPin size={14} />
          <span>{profile.region.toUpperCase()}</span>
          <span>•</span>
          <span style={{
            borderRadius: 6, background: 'rgba(197,84,212,0.15)',
            color: 'var(--primary)', padding: '2px 8px', fontSize: 11, fontWeight: 500,
          }}>
            {profile.gender === 'M' ? '♂ Male' : '♀ Female'}
          </span>
        </div>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          {myMatch && (
            <button onClick={() => { impact('medium'); navigate(`/duo/${myMatch.id}`) }}
              style={{
                padding: '10px 20px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              }}>
              <Sparkles size={16} /> Duo Journey
            </button>
          )}
          {myMatch && (
            <button onClick={() => { impact('light'); navigate(`/chat/${myMatch.id}`) }}
              style={{
                padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--secondary)', color: 'var(--foreground)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              }}>
              <MessageCircle size={16} /> Chat
            </button>
          )}
        </div>
      </div>

      {/* About */}
      {profile.bio && (
        <section style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ marginBottom: 8 }}>About</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted-foreground)' }}>
            {profile.bio}
          </p>
        </section>
      )}

      {/* Blog */}
      {profile.blog && (
        <section style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={16} /> Blog
          </h3>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap' }}>
            {profile.blog}
          </div>
        </section>
      )}

      {/* Games */}
      <section style={{ padding: '20px 16px' }}>
        <h3 className="section-title" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gamepad2 size={16} /> Games
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(profileGames).map(([gk, gp]) => {
            const gi = displayGames.find(g => g.key === gk)
            const hasRoles = Object.keys(gp.roles || {}).length > 0
            return (
              <div key={gk} style={{
                padding: '14px 16px', borderRadius: 14,
                background: 'var(--card)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{gi?.icon || '🎮'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{gi?.display || gk}</div>
                    {gp.rank && (
                      <div style={{ fontSize: 12, color: 'var(--gold)' }}>
                        <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                        {gp.rank}
                      </div>
                    )}
                  </div>
                  {gp.rank && (
                    <div style={{
                      borderRadius: 8, background: 'rgba(212,184,76,0.12)',
                      color: 'var(--gold)', padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                      {gp.rank}
                    </div>
                  )}
                </div>
                {hasRoles && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {Object.entries(gp.roles).map(([role, rank]) => (
                      <span key={role} style={{
                        borderRadius: 6, background: 'rgba(197,84,212,0.08)',
                        color: 'var(--primary)', padding: '3px 8px', fontSize: 11, fontWeight: 500,
                      }}>
                        {role}{rank ? `: ${rank}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

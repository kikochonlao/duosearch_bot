import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Gamepad2, Calendar, Trophy, ArrowLeft, Zap, Star, Sparkles, Flame } from 'lucide-react'
import { api, DuoStatus, Memory, AchievementDef } from '../api/client'
import { impact } from '../utils/haptic'

const CATEGORIES: Record<string, string> = {
  communication: '#5fc8dd',
  gaming: '#c554d4',
  milestones: '#d4b84c',
  loyalty: '#4dd47a',
  competitive: '#e8494a',
}

export default function DuoJourney() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<DuoStatus | null>(null)
  const [achievements, setAchievements] = useState<AchievementDef[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'journey' | 'achievements'>('journey')

  useEffect(() => {
    if (!matchId) return
    Promise.all([
      api.getDuoStatus(Number(matchId)).then(s => setStatus(s)),
      api.getAchievements(Number(matchId)).then(a => setAchievements(a)),
      api.getMemories(Number(matchId)).then(m => setMemories(m)),
    ]).then(() => setLoading(false)).catch(() => setLoading(false))
  }, [matchId])

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 60 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      </main>
    )
  }

  if (!status) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 60, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)' }}>Could not load duo journey</p>
      </main>
    )
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const rarityColor = (r: string) => r === 'legendary' ? '#d4b84c' : r === 'epic' ? '#c554d4' : r === 'rare' ? '#5fc8dd' : 'var(--muted-foreground)'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      <div className="sticky-header">
        <button onClick={() => { impact('light'); navigate(-1) }}
          style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Duo Journey</h1>
        <div style={{ width: 20 }} />
      </div>

      {/* Level Card */}
      <div style={{ margin: '16px', padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #1a1230, #2a1a45, #1a1230)', border: '1px solid rgba(197,84,212,0.3)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(197,84,212,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 0 30px rgba(197,84,212,0.4)' }}>
          <Heart size={32} color="#fff" fill="#fff" />
        </div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Level {status.level}</h2>
        <h3 style={{ fontSize: 22, fontWeight: 700, background: 'linear-gradient(135deg, var(--primary), #e8579e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{status.level_name}</h3>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 12, marginBottom: 8 }}>
          <Zap size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {status.xp} / {status.xp_next} XP
        </p>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(197,84,212,0.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(status.progress * 100)}%`, borderRadius: 4, background: 'linear-gradient(90deg, var(--primary), var(--accent))', transition: 'width 0.5s ease' }} />
        </div>
        {status.duo_name && (
          <p style={{ fontSize: 14, color: 'var(--accent)', marginTop: 12 }}>
            <Heart size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {status.duo_name}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Level', value: status.level, icon: Star },
          { label: 'Achievements', value: `${unlockedCount}/${achievements.length}`, icon: Trophy },
          { label: 'Memories', value: memories.length, icon: Sparkles },
        ].map(s => (
          <div key={s.label} style={{ padding: 12, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <s.icon size={18} color="var(--primary)" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ margin: '0 16px 16px', display: 'flex', gap: 8 }}>
        {(['journey', 'achievements'] as const).map(t => (
          <button key={t} onClick={() => { impact('light'); setTab(t) }} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
            background: tab === t ? 'var(--primary)' : 'var(--secondary)',
            color: tab === t ? '#fff' : 'var(--muted-foreground)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t === 'journey' ? 'Timeline' : 'Achievements'}
          </button>
        ))}
      </div>

      {tab === 'journey' && (
        <div style={{ margin: '0 16px' }}>
          {memories.length === 0 ? (
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: 40, fontSize: 14 }}>
              No memories yet. Start interacting to unlock your journey!
            </p>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
              {memories.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', gap: 12, paddingBottom: 20, position: 'relative', animation: 'fadeIn 0.3s ease-out', animationDelay: `${i * 50}ms` }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(197,84,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--primary)', fontSize: 18 }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {(() => {
                      let desc = m.description || ''
                      try { const parsed = JSON.parse(desc); desc = parsed.title || parsed.description || desc } catch {}
                      return desc ? <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 4 }}>{desc}</p> : null
                    })()}
                    <span style={{ fontSize: 11, color: rarityColor(m.rarity) }}>+{m.xp_earned} XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'achievements' && (
        <div style={{ margin: '0 16px' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {achievements.map(a => {
              const catColor = CATEGORIES[a.category] || 'var(--muted-foreground)'
              const isLegendary = a.rarity === 'legendary'
              return (
                <div key={a.key} style={{
                  padding: 14, borderRadius: 12,
                  background: a.unlocked ? 'var(--card)' : 'var(--secondary)',
                  border: `1px solid ${a.unlocked ? (isLegendary ? 'rgba(212,184,76,0.4)' : 'var(--border)') : 'transparent'}`,
                  opacity: a.unlocked ? 1 : 0.5,
                  boxShadow: a.unlocked && isLegendary ? '0 0 20px rgba(212,184,76,0.15)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: a.unlocked ? `${catColor}22` : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Trophy size={18} color={a.unlocked ? catColor : 'var(--muted-foreground)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{a.description}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: catColor, textTransform: 'capitalize' }}>{a.rarity}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{a.category}</span>
                        {a.unlocked && a.unlocked_at && (
                          <span style={{ fontSize: 11, color: 'var(--green)' }}>
                            Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {a.unlocked ? (
                      <Flame size={18} color={isLegendary ? '#d4b84c' : 'var(--green)'} />
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--muted-foreground)' }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}

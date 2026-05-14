const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const tg = window.Telegram?.WebApp
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (tg?.initData) {
    headers['x-telegram-init-data'] = tg.initData
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }

  return res.json()
}

export interface GameInfo {
  key: string
  display: string
  has_roles: boolean
  rank_per_role: boolean
  ranks: string[]
  roles: string[]
}

export interface Profile {
  id: number
  telegram_id: number
  username: string | null
  name: string
  age: number
  gender: string
  language: string
  region: string
  looking_for: string
  games: Record<string, { rank?: string; roles: Record<string, string> }>
  is_banned: number
}

export interface ProfileUpdate {
  name?: string
  age?: number
  gender?: string
  language?: string
  region?: string
  looking_for?: string
  games?: Record<string, { rank?: string; roles: Record<string, string> }>
}

export interface Candidate {
  user: Profile
  score: number
}

export interface MatchItem {
  id: number
  matched_user: Profile
  created_at: string
  has_active_chat: boolean
}

export interface MessageItem {
  id: number
  from_telegram_id: number
  text: string
  created_at: string
}

export interface ChatSessionInfo {
  id: number
  match_id: number
  other_user: { id: number; telegram_id: number; name: string }
  is_active: boolean
  created_at: string
}

export const api = {
  login: (initData: string) =>
    request<{ ok: boolean; telegram_id: number; username: string | null; is_registered: boolean; user_id: number | null }>(
      `/auth/login?init_data=${encodeURIComponent(initData)}`, { method: 'POST' }
    ),

  getProfile: () =>
    request<Profile>('/profile/'),

  createProfile: (data: ProfileUpdate) =>
    request<Profile>('/profile/', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),

  updateProfile: (data: ProfileUpdate) =>
    request<Profile>('/profile/', { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),

  getFeed: (game: string) =>
    request<{ candidates: Candidate[]; total: number }>(`/discover/feed?game=${encodeURIComponent(game)}`),

  likeUser: (toTelegramId: number, game?: string) =>
    request<{ is_match: boolean; match_id: number | null; matched_user: Profile | null }>(
      '/discover/like', { method: 'POST', body: JSON.stringify({ to_telegram_id: toTelegramId, game }), headers: { 'Content-Type': 'application/json' } }
    ),

  skipUser: (toTelegramId: number) =>
    request<{ ok: boolean }>('/discover/skip', { method: 'POST', body: JSON.stringify({ to_telegram_id: toTelegramId }), headers: { 'Content-Type': 'application/json' } }),

  getMatches: () =>
    request<MatchItem[]>('/matches/'),

  getChatSessions: () =>
    request<ChatSessionInfo[]>('/chat/sessions'),

  getMessages: (matchId: number) =>
    request<MessageItem[]>(`/chat/${matchId}/messages`),

  sendMessage: (matchId: number, text: string) =>
    request<MessageItem>(`/chat/${matchId}/messages`, { method: 'POST', body: JSON.stringify({ text }), headers: { 'Content-Type': 'application/json' } }),

  getGames: () =>
    request<{ games: GameInfo[] }>('/games/'),
}

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
    const text = await res.text().catch(() => '')
    let detail = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text)
      const d = j.detail
      if (typeof d === 'string') detail = d
      else if (Array.isArray(d)) detail = d.map((e: any) => e.msg || JSON.stringify(e)).join('; ')
      else if (d && typeof d === 'object') detail = JSON.stringify(d)
    } catch {}
    throw new Error(detail)
  }

  return res.json()
}

export interface GameInfo {
  key: string
  display: string
  icon: string
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
  bio: string | null
  photo_url: string | null
  looking_for: string
  games: Record<string, { rank?: string; roles: Record<string, string>; playtime_hours?: number }>
  is_banned: number
  steam_id: string | null
  blog: string | null
}

export interface ProfileUpdate {
  name?: string
  age?: number
  gender?: string
  language?: string
  region?: string
  bio?: string
  photo_url?: string
  looking_for?: string
  games?: Record<string, { rank?: string; roles: Record<string, string> }>
  blog?: string
}

export interface SteamGame {
  app_id: number
  name: string
  playtime_hours: number
  logo_url: string | null
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
  last_message?: string
  last_message_at?: string
}

export interface LobbyItem {
  id: number
  creator_id: number
  game: string
  title: string
  description: string | null
  max_players: number
  is_public: boolean
  status: string
  member_count: number
  creator_name: string
  created_at: string
}

export interface LobbyMemberInfo {
  id: number
  user_id: number
  name: string
  telegram_id: number
  role: string
  status: string
  joined_at: string
}

export interface LobbyDetail {
  id: number
  creator_id: number
  game: string
  title: string
  description: string | null
  max_players: number
  is_public: boolean
  status: string
  member_count: number
  creator_name: string
  members: LobbyMemberInfo[]
  created_at: string
}

export interface LobbyMessageInfo {
  id: number
  user_id: number
  name: string
  text: string
  created_at: string
}

export const api = {
  blockUser: (targetTelegramId: number) =>
    request<{ ok: boolean }>('/profile/block', { method: 'POST', body: JSON.stringify({ target_telegram_id: targetTelegramId }), headers: { 'Content-Type': 'application/json' } }),

  unblockUser: (targetTelegramId: number) =>
    request<{ ok: boolean }>('/profile/unblock', { method: 'POST', body: JSON.stringify({ target_telegram_id: targetTelegramId }), headers: { 'Content-Type': 'application/json' } }),

  getBlockedUsers: () =>
    request<Profile[]>('/profile/blocked'),

  reportUser: (targetTelegramId: number, reason?: string) =>
    request<{ ok: boolean; auto_banned: boolean; total_reports: number }>('/profile/report', { method: 'POST', body: JSON.stringify({ target_telegram_id: targetTelegramId, reason }), headers: { 'Content-Type': 'application/json' } }),

  connectSteam: (steamId: string) =>
    request<{ ok: boolean; steam_id: string; imported?: { key: string; name: string; playtime_hours: number }[]; games?: Record<string, { rank?: string; roles: Record<string, string>; playtime_hours?: number }> }>('/profile/steam/connect', { method: 'POST', body: JSON.stringify({ steam_id: steamId }), headers: { 'Content-Type': 'application/json' } }),

  disconnectSteam: () =>
    request<{ ok: boolean }>('/profile/steam/disconnect', { method: 'POST' }),

  getSteamGames: () =>
    request<{ games: SteamGame[] }>('/profile/steam/games'),

  importSteamGames: () =>
    request<{ imported: { key: string; name: string; playtime_hours: number }[]; games: Record<string, { rank?: string; roles: Record<string, string>; playtime_hours?: number }>; message?: string }>('/profile/steam/import', { method: 'POST' }),

  login: (initData: string) =>
    request<{ ok: boolean; telegram_id: number; username: string | null; is_registered: boolean; user_id: number | null }>(
      `/auth/login?init_data=${encodeURIComponent(initData)}`, { method: 'POST' }
    ),

  getProfile: () =>
    request<Profile>('/profile/'),

  getUserProfile: (telegramId: number) =>
    request<Profile>(`/profile/by-telegram/${telegramId}`),

  createProfile: (data: ProfileUpdate) =>
    request<Profile>('/profile/', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),

  updateProfile: (data: ProfileUpdate) =>
    request<Profile>('/profile/', { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),

  getFeed: (game: string, gender?: string, region?: string, ageMin?: number, ageMax?: number) => {
    const params = new URLSearchParams()
    params.set('game', game || '')
    if (gender) params.set('gender', gender)
    if (region) params.set('region', region)
    if (ageMin !== undefined) params.set('age_min', String(ageMin))
    if (ageMax !== undefined) params.set('age_max', String(ageMax))
    return request<{ candidates: Candidate[]; total: number }>(`/discover/feed?${params}`)
  },

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

  createLobby: (data: { game: string; title: string; description?: string; max_players?: number; is_public?: boolean }) =>
    request<LobbyItem>('/lobbies', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),

  listLobbies: (game?: string, search?: string) =>
    request<{ lobbies: LobbyItem[] }>(`/lobbies?game=${encodeURIComponent(game || '')}&search=${encodeURIComponent(search || '')}`),

  getMyLobbies: () =>
    request<{ lobbies: LobbyItem[] }>('/lobbies/mine'),

  getLobby: (id: number) =>
    request<LobbyDetail>(`/lobbies/${id}`),

  joinLobby: (id: number) =>
    request<{ ok: boolean }>(`/lobbies/${id}/join`, { method: 'POST' }),

  leaveLobby: (id: number) =>
    request<{ ok: boolean }>(`/lobbies/${id}/leave`, { method: 'POST' }),

  approveMember: (lobbyId: number, userId: number) =>
    request<{ ok: boolean }>(`/lobbies/${lobbyId}/approve/${userId}`, { method: 'POST' }),

  kickMember: (lobbyId: number, userId: number) =>
    request<{ ok: boolean }>(`/lobbies/${lobbyId}/kick/${userId}`, { method: 'POST' }),

  closeLobby: (id: number) =>
    request<{ ok: boolean }>(`/lobbies/${id}/close`, { method: 'POST' }),

  getLobbyMessages: (id: number) =>
    request<LobbyMessageInfo[]>(`/lobbies/${id}/messages`),

  sendLobbyMessage: (id: number, text: string) =>
    request<LobbyMessageInfo>(`/lobbies/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }), headers: { 'Content-Type': 'application/json' } }),
}

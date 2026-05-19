import httpx
from config import settings


async def verify_steam_id(steam_id: str) -> bool:
    if not settings.STEAM_API_KEY:
        return False
    url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={"key": settings.STEAM_API_KEY, "steamids": steam_id})
        if resp.status_code != 200:
            return False
        data = resp.json()
        players = data.get("response", {}).get("players", [])
        return len(players) > 0


async def get_steam_games(steam_id: str) -> list[dict]:
    if not settings.STEAM_API_KEY:
        return []
    url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={
            "key": settings.STEAM_API_KEY,
            "steamid": steam_id,
            "include_played_free_games": True,
            "include_appinfo": True,
        })
        if resp.status_code != 200:
            return []
        data = resp.json()
        games = data.get("response", {}).get("games", [])
        result = []
        for g in games:
            minutes = g.get("playtime_forever", 0)
            result.append({
                "app_id": g["appid"],
                "name": g.get("name", "Unknown"),
                "playtime_hours": round(minutes / 60, 1),
                "logo_url": f"https://media.steampowered.com/steamcommunity/public/images/apps/{g['appid']}/{g.get('img_logo_url', '')}.jpg" if g.get("img_logo_url") else None,
            })
        return result

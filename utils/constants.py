LANGS = {
    "ru": "🇷🇺 Русский",
    "en": "🇺🇸 English",
    "uk": "🇺🇦 Українська",
    "kz": "🇰🇿 Қазақша",
    "by": "🇧🇾 Беларуская",
    "uz": "🇺🇿 Oʻzbekcha",
}

REGIONS = {
    "cis": "🌍 СНГ",
    "eu": "🌍 Europe",
    "na": "🌎 North America",
    "asia": "🌏 Asia",
    "sa": "🌎 South America",
    "oce": "🏝️ Oceania",
}

GENDER_LABELS = {"M": "👨 Парень", "F": "👩 Девушка"}


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

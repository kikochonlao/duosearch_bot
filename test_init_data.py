import hashlib, hmac, urllib.parse, json

bot_token = "8329026718:AAGDM-hWxDjzr1zSy6XygllT7t4lzUE--FA"
user = json.dumps({"id": 999999, "first_name": "Test", "username": "testuser"})
data = {"auth_date": "1712345678", "user": user}
items = sorted(data.items())
data_check_string = "\n".join(f"{k}={v}" for k, v in items)
secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
hash_val = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
data["hash"] = hash_val
result = urllib.parse.urlencode(data)
print(result)

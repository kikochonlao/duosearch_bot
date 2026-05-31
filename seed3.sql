-- Update games to include lol for compatibility with main user (id=1, plays only lol)
UPDATE users SET games = '{"cs2":{"rank":"LE","roles":{}},"dota2":{"rank":"Ancient","roles":{}},"apex":{"rank":"Diamond","roles":{}},"lol":{"rank":"Gold","roles":{}}}' WHERE id = 100;
UPDATE users SET games = '{"overwatch":{"rank":"Master","roles":{"main":"Support"}},"valorant":{"rank":"Gold","roles":{}},"lol":{"rank":"Silver","roles":{}}}' WHERE id = 101;
UPDATE users SET games = '{"pubg":{"rank":"Diamond","roles":{}},"rust":{"rank":null,"roles":{}},"cs2":{"rank":"MG2","roles":{}},"lol":{"rank":"Platinum","roles":{}}}' WHERE id = 102;
UPDATE users SET games = '{"overwatch":{"rank":"Platinum","roles":{"flex":"Support"}},"apex":{"rank":"Gold","roles":{}},"fortnite":{"rank":null,"roles":{}},"lol":{"rank":"Unranked","roles":{}}}' WHERE id = 103;
UPDATE users SET games = '{"dota2":{"rank":"Divine","roles":{"main":"Mid"}},"lol":{"rank":"Platinum","roles":{}}}' WHERE id = 104;
UPDATE users SET games = '{"minecraft":{"rank":null,"roles":{}},"fortnite":{"rank":null,"roles":{}},"apex":{"rank":"Silver","roles":{}},"lol":{"rank":"Bronze","roles":{}}}' WHERE id = 105;
UPDATE users SET games = '{"overwatch":{"rank":"Diamond","roles":{"flex":"Tank"}},"cs2":{"rank":"GN4","roles":{}},"rocket_league":{"rank":"Champion","roles":{}},"lol":{"rank":"Emerald","roles":{}}}' WHERE id = 106;
UPDATE users SET games = '{"pubg":{"rank":"Platinum","roles":{"main":"Sniper"}},"valorant":{"rank":"Gold","roles":{}},"lol":{"rank":"Silver","roles":{}}}' WHERE id = 107;

-- Fake users (use explicit IDs to avoid conflicts)
INSERT INTO users (id, telegram_id, username, name, age, gender, language, region, bio, photo_url, looking_for, games, is_banned, created_at)
VALUES
(100, 100001, 'alex_gamer', 'Alex', 25, 'M', 'ru_uz', 'cis', 'CS2 and Dota2 grinder', 'https://i.pravatar.cc/300?u=1', 'teammate', '{"cs2":{"rank":"LE","roles":{}},"dota2":{"rank":"Ancient","roles":{}},"apex":{"rank":"Diamond","roles":{}}}', 0, NOW()),
(101, 100002, 'maria_ow', 'Maria', 23, 'F', 'ru_uz', 'cis', 'Overwatch main support', 'https://i.pravatar.cc/300?u=2', 'teammate', '{"overwatch":{"rank":"Master","roles":{"main":"Support"}},"valorant":{"rank":"Gold","roles":{}},"lol":{"rank":"Silver","roles":{}}}', 0, NOW()),
(102, 100003, 'dima_pubg', 'Dmitry', 30, 'M', 'en_ru_uz', 'cis', 'PUBG veteran 2000h+', 'https://i.pravatar.cc/300?u=3', 'any', '{"pubg":{"rank":"Diamond","roles":{}},"rust":{"rank":null,"roles":{}},"cs2":{"rank":"MG2","roles":{}}}', 0, NOW()),
(103, 100004, 'elena_ow', 'Elena', 27, 'F', 'ru_uz', 'cis', 'Looking for duo in Overwatch', 'https://i.pravatar.cc/300?u=4', 'duo', '{"overwatch":{"rank":"Platinum","roles":{"flex":"Support"}},"apex":{"rank":"Gold","roles":{}},"fortnite":{"rank":null,"roles":{}}}', 0, NOW()),
(104, 100005, 'serg_dota', 'Sergey', 35, 'M', 'ru_uz', 'cis', 'Dota2 since WC3 days', 'https://i.pravatar.cc/300?u=5', 'teammate', '{"dota2":{"rank":"Divine","roles":{"main":"Mid"}},"lol":{"rank":"Platinum","roles":{}}}', 0, NOW()),
(105, 100006, 'anna_mc', 'Anna', 22, 'F', 'en_ru_uz', 'cis', 'Building and farming', 'https://i.pravatar.cc/300?u=6', 'any', '{"minecraft":{"rank":null,"roles":{}},"fortnite":{"rank":null,"roles":{}},"apex":{"rank":"Silver","roles":{}}}', 0, NOW()),
(106, 100007, 'vitaly_ow', 'Vitaly', 28, 'M', 'ru_uz', 'cis', 'Flex player OW + CS', 'https://i.pravatar.cc/300?u=7', 'teammate', '{"overwatch":{"rank":"Diamond","roles":{"flex":"Tank"}},"cs2":{"rank":"GN4","roles":{}},"rocket_league":{"rank":"Champion","roles":{}}}', 0, NOW()),
(107, 100008, 'olga_pubg', 'Olga', 24, 'F', 'ru_uz', 'cis', 'PUBG sniper looking for squad', 'https://i.pravatar.cc/300?u=8', 'squad', '{"pubg":{"rank":"Platinum","roles":{"main":"Sniper"}},"valorant":{"rank":"Gold","roles":{}}}', 0, NOW());

-- Lobbies
INSERT INTO lobbies (creator_id, game, title, description, max_players, is_public, status) VALUES
(100, 'cs2', 'Competitive CS2', 'Need 3 more, LE+', 5, true, 'open'),
(101, 'overwatch', 'OW Flex Support', 'Looking for flex support duo', 2, true, 'open'),
(102, 'pubg', 'PUBG Squad', 'Squad up for ranked', 4, true, 'open'),
(100, 'apex', 'Apex Ranked Push', 'Need 2 for Diamond', 3, true, 'open'),
(104, 'valorant', 'Valo Unrated', 'Chill games, gold lobby', 5, true, 'open'),
(105, 'dota2', 'Dota 2 Ranked', 'Need mid player, Ancient+', 5, true, 'open'),
(102, 'rust', 'Rust New Wipe', 'Starting fresh, need group', 6, true, 'open'),
(107, 'overwatch', 'OW Tank Duo', 'Need tank for comp', 2, true, 'open');

# Guild of The Void - External API Documentation (v1.2)

This API allows external tools, integrations, and browser extensions to interact with your "Guild of The Void" data using an API key generated on your account.

## Authentication & Permissions

* **GET Requests (Public)**: All `GET` endpoints are public and **do not require an API key or token**.
* **POST / PATCH Requests (Authenticated)**: All mutation operations strictly require an API key, either via the `Authorization` header (`Bearer vg_your_api_key_here`) or `apiKey` parameter.
* **Ownership & Access Control**:
  * API keys can **only modify characters, worlds, and sessions that the authenticated user owns**.
  * **Admin Exception**: If the user is an administrator (`isAdmin: true`), their API key has global authority to modify any character, session, or world.
* **Security Guarantees**:
  * Character **XP** (`xp`) and **Level** (`lvl`) values **CANNOT** be modified via the API by anyone (they are strictly computed from completed sessions).
  * Character **deletion** is completely disabled over the API.

```http
Authorization: Bearer vg_your_api_key_here
```

To generate an API key, click on your **User Profile** avatar in the top right menu and select **API Access**.

## Base URL

```
https://guild.tarragon.be/api/external/v1
```

---

## Endpoints

### Sessions
* **GET** `/sessions?past=true|false&isIntro=true|false&worldId=...&system=PF|DnD` - List all sessions with filters (private sessions are filtered out unless requester owns them or is an Admin).
* **GET** `/session/:sessionId` - Get detailed session info including attending characters, GM character, and quest.
* **GET** `/session/:sessionId/characters` - List attending characters in a session.
* **GET** `/session/:sessionId/quotes` - List character quotes logged in a session.
* **GET** `/session/:sessionId/state` - Get live initiative and clock state.
* **POST** `/session` - Create a new session (GM/Admin). Body: `{ date?, level?, maxPlayers, system, location?, planning?, isPrivate?, isIntro?, worldId?, inGameDate?: { year, month, day, era?, endYear?, endMonth?, endDay? } }`. *(Note: If `inGameDate` is omitted, it defaults automatically to the campaign world's current calendar date; if `isIntro` is true, level defaults automatically to 1 for Pathfinder or 3 for DnD).*
* **POST** `/session/:sessionId/loot` - Add loot item to a session (Owner/Admin). Body: `{ name, valueGP, isGood, isPerCharacter?, link?, quantity? }`.
* **POST** `/session/:sessionId/commendation` - Submit a character commendation. Body: `{ toCharacterId, category }`.
* **PATCH** `/session/:sessionId` - Update session parameters (Owner/Admin). Body: `{ date?, level?, maxPlayers?, location?, locked?, planning?, isPrivate?, isIntro?, inGameDate?: { year, month, day, era?, endYear?, endMonth?, endDay? } }`.
* **PATCH** `/session/:sessionId/state` - Update initiative/clock (Owner/Admin). Body: `{ initiative?, currentIndex?, round?, timeSeconds?, isClockRunning?, multiplier? }`.

### Characters
* **GET** `/characters?userId=...` - List all characters (public, no auth required; optionally filter by `userId`).
* **GET** `/character/:characterId` - Get full character details (includes synced `details` character sheet if present).
* **GET** `/character/:characterId/sheet` - Get detailed Pathbuilder 2e character sheet data (defenses, HP, saves, skills, lores, money, gear, build feats, conditions).
* **POST** `/character` - Create a new character for your account (starts at level 1, 0 XP). Body: `{ name, ancestry?, class?, system, websiteLink? }`.
* **POST** `/character/:characterId/sheet` - Push/sync character sheet data (Owner/Admin). Accepts raw Pathbuilder exports (`build` or `rawExport`), simplified flat stats (`hp: number`, `ac: number`, `abilities: record`, `saves: record`, `skills: record`, `money: number`), or full structured `CharacterSheetDetails`.
* **PATCH** `/character/:characterId` - Update character details (Owner/Admin only; XP and Level cannot be modified via API). Body: `{ name?, ancestry?, class?, websiteLink? }`.
* **PATCH** `/character/:characterId/sheet` - Update/sync character sheet data (Owner/Admin). Same flexible payload support as `POST`.

### Worlds & Quests
* **GET** `/worlds` - List all campaign worlds.
* **GET** `/world/:worldId` - Get details for a specific world.
* **GET** `/world/:worldId/calendar` - Get world calendar config and current date.
* **GET** `/world/:worldId/quests` - List all quests associated with a specific world.
* **GET** `/quests` - List all quests (global "The Void" quests + world quests).
* **GET** `/character-quests?characterId=...` - List character-issued quests (filter by `characterId` or list all).
* **POST** `/quest` - Create a new quest. Body: `{ name, levelPF?, levelDnD?, worldId?, description?, questgiver?, reward?, rewardType?: "party" | "per_person", rewardMoneyGP?: number, rewardOther?: string, tags?, characterId? }`.
* **PATCH** `/world/:worldId/calendar` - Update world date. Body: `{ year, month, day }`.
* **PATCH** `/quest/:questId` - Update quest status or details. Body: `{ isCompleted?, name?, description?, reward?, rewardType?, rewardMoneyGP?, rewardOther? }`.

### The Black Void (Auction House & Market)
* **GET** `/black-void/listings?type=item|service&status=active|completed` - List items and crafting services on The Black Void market.
* **GET** `/black-void/character/:characterId/transactions` - Get sold items and won auctions for a specific character.
* **GET** `/black-void/character/:characterId/log` - Get full character sheet transaction log (created items, won items, services, sponsored quest reimbursements, completed quests to pay, Guildmaster cuts, won/lost bets, current money, and unclaimed count).
* **POST** `/black-void/item` - Post an item listing (Owner of character). Body: `{ characterId, name, startingBid?, buyoutPrice?, durationDays, description?, nethysUrl? }`.
* **POST** `/black-void/service` - Post a crafting/service listing (Owner of character). Body: `{ characterId, name, priceType, percentage?, markupGp?, priceDetails?, minLevel?, maxLevel?, description?, nethysUrl? }`.
* **POST** `/black-void/bid` - Place a bid, auto-bid cap, or buyout on an item listing (Owner of character). Body: `{ listingId, characterId, amount, maxAutoBid?, isBuyout }`.
* **PATCH** `/black-void/claim/seller` - Toggle claim state for a sold listing (Owner/Admin). Body: `{ listingId }`.
* **PATCH** `/black-void/claim/buyer` - Toggle claim state for a won auction listing (Owner/Admin). Body: `{ listingId }`.
* **PATCH** `/black-void/claim/quest` - Toggle claim state for quest reimbursement or payment (Owner/Admin). Body: `{ questId, type: "reimbursement" | "payment" }`.
* **PATCH** `/black-void/claim/guildmaster` - Toggle claim state for Guildmaster regional loot compensation (Owner/Admin). Body: `{ sessionId }`.
* **PATCH** `/black-void/claim/bet/winner` - Toggle claim state for a won bet (Owner/Admin). Body: `{ betId }`.
* **PATCH** `/black-void/claim/bet/loser` - Toggle claim state for a lost bet (Owner/Admin). Body: `{ betId }`.
* **PATCH** `/black-void/claim/all` - Mark all log entries for a character as claimed in one transaction (Owner/Admin). Body: `{ characterId }`.

### Reputation
* **GET** `/world/:worldId/reputation` - Get all reputation scores for characters in a world.
* **PATCH** `/reputation` - Update character reputation (World Owner/Admin). Body: `{ worldId, characterId, factionName, delta }`.

### Availability & Player Schedule
* **GET** `/availability?startDate=...&endDate=...` - Get player availability calendar entries.
* **POST** `/availability` - Toggle user availability for a given timestamp. Body: `{ date, isGM }`.

### Commendations & Achievements
* **GET** `/commendations?sessionId=...&characterId=...` - List player commendations.
* **GET** `/achievements` - List unlocked achievements for the authenticated user.

### Discovery & Search
* **GET** `/search?q=...` - Search worlds and characters by name.
* **GET** `/activity?limit=...` - Get recent activity feed entries.

---

## Character Sheet Sync & Ingestion

The endpoint `POST /character/:characterId/sheet` (and `PATCH`) supports flexible synchronization from browser extensions, third-party apps, or scripts.

### Supported Ingestion Modes

1. **Direct Pathbuilder 2e JSON Export (`build` or `rawExport`)**
   * Pass the full exported JSON object from Pathbuilder under `build` or `rawExport`.
   * **Automatic Server-Side Calculations:**
     * **Hit Points:** Calculated automatically as `ancestryHP + (classHP + conMod) * level + bonusHP` if not explicitly given.
     * **Armor Class:** Extracted and calculated from `build.proficiencies` and equipped armor/dexterity bonus.
     * **Saves:** Fortitude, Reflex, Will, and Perception bonuses are calculated from proficiencies and ability modifiers.
     * **Skills & Lores:** Extracted and mapped from `build.proficiencies` and `build.lores`.
     * **Abilities:** Extracted from `build.abilities` (defaults missing stats to 10).
     * **Money & Gear:** Parsed from `build.money` and `build.weapons`/`build.armor`/`build.gear`.

2. **Simplified / Flat Key-Value Payload**
   * **Hit Points (`hp`)**: Can be a single number (e.g. `hp: 48` -> normalized to `{ current: 48, max: 48, temporary: 0 }`) or `{ current: 35, max: 48, temporary: 5 }`.
   * **Armor Class (`ac`)**: Can be a single number (e.g. `ac: 22` -> normalized to `{ total: 22 }`) or structured `armorClass` object.
   * **Ability Scores (`abilities`)**: A record like `{"str": 18, "dex": 14, "con": 16, "int": 10, "wis": 12, "cha": 10}`. Missing values default to 10.
   * **Saves (`saves`)**: Can provide flat bonus numbers:
     ```json
     {
       "fortitude": 11,
       "reflex": 9,
       "will": 12,
       "perception": 10
     }
     ```
     or structured `{ bonus: 11, proficiency: "E" }`.
   * **Skills (`skills`)**: Can be provided as a dictionary of names to bonus numbers:
     ```json
     {
       "Athletics": 11,
       "Acrobatics": 9,
       "Stealth": 7,
       "Warfare Lore": 6
     }
     ```
     or a full array/record of detailed skill objects.
   * **Money (`money`)**: Can be a single gold number (e.g. `money: 125.5` -> normalized to `totalInGold: 125.5`) or a currency breakdown `{ cp: 0, sp: 5, gp: 125, pp: 0 }`.

3. **Full Structured `CharacterSheetDetails` Payload**
   * Pass fully validated `hitPoints`, `armorClass`, `saves`, `abilities`, `skills`, `gear`, `conditions`, and `buildSummary` objects matching the database schema.

---

## Data Models

### Session
```json
{
  "_id": "s7...",
  "date": 1757721600000,
  "inGameDate": {
    "year": 15419,
    "month": 6,
    "day": 8,
    "endYear": 15419,
    "endMonth": 6,
    "endDay": 10
  },
  "level": 1,
  "maxPlayers": 5,
  "system": "PF",
  "world": "wd7...",
  "owner": "user_...",
  "location": "Ouroubouros Inn",
  "planning": false,
  "isPrivate": false,
  "isIntro": true,
  "characters": ["jh7..."],
  "locked": false
}
```

### Character
```json
{
  "_id": "jh7...",
  "name": "Kaelen",
  "title": "Defender of the Void",
  "player": "John D.",
  "lvl": 5,
  "xp": 450,
  "ancestry": "Human",
  "class": "Fighter",
  "system": "PF",
  "userId": "user_...",
  "rank": "journeyman",
  "websiteLink": "https://..."
}
```

### Character Sheet Details (`characterDetails`)
```json
{
  "_id": "cd7...",
  "characterId": "jh7...",
  "system": "PF",
  "abilities": {
    "str": 18,
    "dex": 14,
    "con": 16,
    "int": 10,
    "wis": 12,
    "cha": 10
  },
  "hitPoints": {
    "max": 68,
    "current": 68,
    "temporary": 0,
    "ancestryHP": 8,
    "classHP": 10
  },
  "armorClass": {
    "total": 22,
    "shieldBonus": 2,
    "equippedArmorName": "Full Plate"
  },
  "saves": {
    "fortitude": { "bonus": 12, "proficiency": "E" },
    "reflex": { "bonus": 9, "proficiency": "T" },
    "will": { "bonus": 10, "proficiency": "E" },
    "perception": { "bonus": 11, "proficiency": "E" }
  },
  "skills": {
    "Athletics": { "name": "Athletics", "bonus": 13, "proficiency": "E" },
    "Intimidation": { "name": "Intimidation", "bonus": 8, "proficiency": "T" }
  },
  "money": {
    "cp": 0,
    "sp": 5,
    "gp": 145,
    "pp": 2,
    "totalInGold": 165.5
  },
  "conditions": [
    { "name": "Frightened", "value": 1 }
  ]
}
```

### Black Void Item Listing
```json
{
  "_id": "bv7...",
  "characterId": "c7...",
  "type": "item",
  "name": "+1 Striking Shortsword",
  "startingBid": 20,
  "buyoutPrice": 50,
  "durationDays": 7,
  "expiresAt": 1757721600000,
  "status": "active",
  "sellerName": "Kaelen",
  "sellerLevel": 5
}
```

### Quest
```json
{
  "_id": "kq7...",
  "name": "The Great Escape",
  "levelPF": 3,
  "levelDnD": 5,
  "worldId": "wd7...",
  "description": "Help the prisoners escape.",
  "questgiver": "Guard Captain",
  "reward": "50 GP / person + Scroll of Invisibility",
  "rewardType": "per_person",
  "rewardMoneyGP": 50,
  "rewardOther": "Scroll of Invisibility",
  "tags": ["stealth", "urban"],
  "owner": "user_...",
  "isCompleted": false
}
```

---

## Usage Examples (cURL)

### Sync Character Sheet (Raw Pathbuilder JSON Export)
```bash
curl -X POST \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{
       "system": "PF",
       "build": {
         "name": "Cracklebone",
         "level": 3,
         "ancestry": "Skeleton",
         "class": "Sorcerer",
         "abilities": { "str": 10, "dex": 14, "con": 12, "int": 12, "wis": 10, "cha": 18 },
         "money": { "cp": 0, "sp": 0, "gp": 85, "pp": 0 },
         "proficiencies": [16, 6, 7, 7, 5, 0, 7, 7, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0]
       }
     }' \
     "https://guild.tarragon.be/api/external/v1/character/[CHARACTER_ID]/sheet"
```

### Sync Character Sheet (Lightweight / Programmatic)
```bash
curl -X POST \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{
       "system": "PF",
       "hp": 32,
       "ac": 17,
       "abilities": { "str": 10, "dex": 14, "con": 12, "int": 12, "wis": 10, "cha": 18 },
       "saves": { "fortitude": 6, "reflex": 7, "will": 7, "perception": 5 },
       "skills": { "Arcana": 7, "Deception": 9, "Intimidation": 9 },
       "money": 85
     }' \
     "https://guild.tarragon.be/api/external/v1/character/[CHARACTER_ID]/sheet"
```

### Create an Item Listing on The Black Void
```bash
curl -X POST \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{"characterId": "c1", "name": "Wand of Healing", "startingBid": 10, "buyoutPrice": 35, "durationDays": 7}' \
     "https://guild.tarragon.be/api/external/v1/black-void/item"
```

### Update Session Initiative
```bash
curl -X PATCH \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{"initiative": [{"id": "c1", "name": "Hero", "counter": 5}], "currentIndex": 0}' \
     "https://guild.tarragon.be/api/external/v1/session/[ID]/state"
```

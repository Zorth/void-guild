# Guild of The Void - External API Documentation

This API allows external tools to interact with your "Guild of The Void" data using an API key generated on your account.

## Authentication

All requests must include your API key in the `Authorization` header as a Bearer token.

```http
Authorization: Bearer vg_your_api_key_here
```

To generate a key, click on your **User Profile** on the home page and select **API Access**.

## Base URL

```
https://guild.tarragon.be/api/external/v1
```

---

## Endpoints

### Sessions
*   **GET** `/sessions?past=true|false&worldId=...&system=PF|DnD` - List all sessions with filters.
*   **GET** `/session/:sessionId` - Get detailed session info including attending characters, GM character, and quest.
*   **GET** `/session/:sessionId/characters` - List attending characters in a session.
*   **GET** `/session/:sessionId/state` - Get live initiative and clock state.
*   **POST** `/session` - Create a new session (GM/Admin). Body: `{ date?, level?, maxPlayers, system, location?, planning?, worldId? }`.
*   **POST** `/session/:sessionId/loot` - Add loot item to a session (Owner/Admin). Body: `{ name, valueGP, isGood, isPerCharacter?, link?, quantity? }`.
*   **POST** `/session/:sessionId/commendation` - Submit a character commendation. Body: `{ toCharacterId, category }`.
*   **PATCH** `/session/:sessionId` - Update session parameters (Owner/Admin). Body: `{ date?, level?, maxPlayers?, location?, locked?, planning? }`.
*   **PATCH** `/session/:sessionId/state` - Update initiative/clock (Owner/Admin). Body: `{ initiative?, currentIndex?, round?, timeSeconds?, isClockRunning?, multiplier? }`.

### Characters
*   **GET** `/characters?userId=...` - List characters owned by a user.
*   **GET** `/character/:characterId` - Get full character details.
*   **POST** `/character` - Create a new character for your account (starts at level 1, 0 XP). Body: `{ name, ancestry?, class?, system?, websiteLink? }`.
*   **PATCH** `/character/:characterId` - Update character details (Owner/Admin only; XP and Level cannot be modified via API). Body: `{ name?, ancestry?, class?, websiteLink? }`.

### Worlds & Quests
*   **GET** `/worlds` - List all campaign worlds.
*   **GET** `/world/:worldId` - Get details for a specific world.
*   **GET** `/world/:worldId/calendar` - Get world calendar config and current date.
*   **GET** `/world/:worldId/quests` - List all quests associated with a specific world.
*   **GET** `/quests` - List all quests (global "The Void" quests + world quests).
*   **POST** `/quest` - Create a new quest. Body: `{ name, levelPF?, levelDnD?, worldId?, description?, questgiver?, reward?, tags?, characterId? }`.
*   **PATCH** `/world/:worldId/calendar` - Update world date. Body: `{ year, month, day }`.
*   **PATCH** `/quest/:questId` - Update quest status or details. Body: `{ isCompleted?, name?, description?, reward? }`.

### The Black Void (Auction House & Market)
*   **GET** `/black-void/listings?type=item|service&status=active|completed` - List items and crafting services on The Black Void market.
*   **GET** `/black-void/character/:characterId/transactions` - Get sold items and won auctions for a specific character.
*   **GET** `/character-quests?characterId=...` - List character-issued quests.
*   **POST** `/black-void/item` - Post an item listing (Owner of character). Body: `{ characterId, name, startingBid?, buyoutPrice?, durationDays, description?, nethysUrl? }`.
*   **POST** `/black-void/service` - Post a crafting/service listing (Owner of character). Body: `{ characterId, name, priceType, percentage?, markupGp?, priceDetails?, description?, nethysUrl? }`.
*   **POST** `/black-void/bid` - Place a bid or buyout on an item listing (Owner of character). Body: `{ listingId, characterId, amount, isBuyout }`.

### Reputation
*   **GET** `/world/:worldId/reputation` - Get all reputation scores for characters in a world.
*   **PATCH** `/reputation` - Update character reputation (World Owner/Admin). Body: `{ worldId, characterId, factionName, delta }`.

### Availability & Player Schedule
*   **GET** `/availability?startDate=...&endDate=...` - Get player availability calendar entries.
*   **POST** `/availability` - Toggle user availability for a given timestamp. Body: `{ date, isGM }`.

### Commendations & Achievements
*   **GET** `/commendations?sessionId=...&characterId=...` - List player commendations.
*   **GET** `/achievements` - List unlocked achievements for the authenticated user.

### Discovery & Search
*   **GET** `/search?q=...` - Search worlds and characters by name.
*   **GET** `/activity?limit=...` - Get recent activity feed entries.

---

## Data Models

### Character
```json
{
  "_id": "jh7...",
  "name": "Kaelen",
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
  "reward": "50gp",
  "tags": ["stealth", "urban"],
  "owner": "user_...",
  "isCompleted": false
}
```

---

## Usage Examples (cURL)

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

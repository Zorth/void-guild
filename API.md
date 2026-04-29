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
*   **GET** `/session/:sessionId/characters` - List characters in a session. Returns simplified character objects (using `id` instead of `_id`).
*   **GET** `/session/:sessionId/state` - Get live initiative and clock state.
*   **PATCH** `/session/:sessionId/state` - Update initiative/clock (Owner only). Body: `{ initiative?, currentIndex?, round?, timeSeconds?, isClockRunning?, multiplier? }`.
*   **POST** `/session` - Create a new session (GM only). Body: `{ date?, level?, maxPlayers, system, location?, planning? }`. `system` must be `"PF"` or `"DnD"`.

### Worlds & Quests
*   **GET** `/world/:worldId/calendar` - Get world calendar config and current date.
*   **PATCH** `/world/:worldId/calendar` - Update world date. Body: `{ year, month, day }`.
*   **GET** `/world/:worldId/quests` - List all quests associated with a specific world.
*   **GET** `/quests` - List all quests (global "The Void" quests + world quests).
*   **PATCH** `/quest/:questId` - Update quest status/details (Owner/Admin only). Body: `{ isCompleted?, name?, description? }`.

### Reputation
*   **GET** `/world/:worldId/reputation` - Get all reputation scores for all characters in a world.
*   **PATCH** `/reputation` - Update a character's reputation (World Owner/Admin only). Body: `{ worldId, characterId, factionName, delta }`.

### Characters
*   **GET** `/character/:characterId` - Get full character details.

### Discovery
*   **GET** `/search?q=...` - Search for worlds and characters by name.
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

### Session State
```json
{
  "sessionId": "s7...",
  "initiative": [
    { "id": "char_1", "name": "Kaelen", "counter": 12 },
    { "id": "custom_1", "name": "Goblin", "counter": 0 }
  ],
  "currentIndex": 0,
  "round": 1,
  "timeSeconds": 32400,
  "isClockRunning": false,
  "multiplier": 1
}
```

### Reputation
```json
{
  "_id": "r7...",
  "worldId": "w7...",
  "characterId": "c7...",
  "factionName": "The Void Guild",
  "value": 15
}
```

### Activity
```json
{
  "_id": "a7...",
  "type": "session_created",
  "message": "A new session was created for The Void",
  "userId": "user_...",
  "metadata": { "sessionId": "s7..." }
}
```

### Search Results
```json
{
  "worlds": [
    { "id": "w7...", "name": "The Void" }
  ],
  "characters": [
    { "id": "c7...", "name": "Kaelen" }
  ]
}
```

---

## Usage Examples (cURL)

### Update Session Initiative
```bash
curl -X PATCH \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{"initiative": [{"id": "c1", "name": "Hero", "counter": 5}], "currentIndex": 0}' \
     "https://guild.tarragon.be/api/external/v1/session/[ID]/state"
```

### Complete a Quest
```bash
curl -X PATCH \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{"isCompleted": true}' \
     "https://guild.tarragon.be/api/external/v1/quest/[ID]"
```

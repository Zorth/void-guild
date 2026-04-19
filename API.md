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
*   **GET** `/session/:sessionId/characters` - List characters in a session.
*   **GET** `/session/:sessionId/state` - Get live initiative and clock state.
*   **PATCH** `/session/:sessionId/state` - Update initiative/clock (Owner only).
*   **POST** `/session` - Create a new session (GM only). Body: `{ date?, level?, maxPlayers, system, location?, planning? }`.

### Worlds & Quests
*   **GET** `/world/:worldId/calendar` - Get world calendar config and date.
*   **PATCH** `/world/:worldId/calendar` - Update world date. Body: `{ year, month, day }`.
*   **GET** `/world/:worldId/quests` - List quests in a world.
*   **GET** `/quests` - List all quests (global + worlds).
*   **PATCH** `/quest/:questId` - Update quest status/details. Body: `{ isCompleted?, name?, description? }`.

### Reputation
*   **GET** `/world/:worldId/reputation` - Get all reputation scores for a world.
*   **PATCH** `/reputation` - Update a character's reputation. Body: `{ worldId, characterId, factionName, delta }`.

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
  "userId": "user_..."
}
```

### Session State
```json
{
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

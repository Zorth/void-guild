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

### 1. Get Session Characters
Retrieves a list of characters currently signed up for a specific session.

*   **URL:** `/session/:sessionId/characters`
*   **Method:** `GET`
*   **Response:** `Array<Character>`

**Example Response:**
```json
[
  {
    "id": "jh7...",
    "name": "Kaelen",
    "lvl": 5,
    "xp": 450,
    "class": "Fighter",
    "ancestry": "Human",
    "userId": "user_..."
  }
]
```

### 2. Get World Calendar
Retrieves the full configuration and current state of a world's Fantasy Calendar.

*   **URL:** `/world/:worldId/calendar`
*   **Method:** `GET`
*   **Response:** `Object`

**Example Response:**
```json
{
  "name": "The Void",
  "calendar": {
    "name": "Standard Calendar",
    "dynamic_data": {
      "year": 2024,
      "month": 3,
      "day": 12
    },
    "static_data": { ... }
  }
}
```

### 3. Update World Date
Updates the current in-game date for a world. You must be the owner of the world or an admin.

*   **URL:** `/world/:worldId/calendar`
*   **Method:** `PATCH`
*   **Body:**
    ```json
    {
      "year": 2024,
      "month": 3,
      "day": 13
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "newDate": { "year": 2024, "month": 3, "day": 13 }
    }
    ```

---

## Usage Examples

### cURL
```bash
# Get characters for a session
curl -H "Authorization: Bearer vg_your_key" \
     "https://guild.tarragon.be/api/external/v1/session/kds7.../characters"

# Advance the world date
curl -X PATCH \
     -H "Authorization: Bearer vg_your_key" \
     -H "Content-Type: application/json" \
     -d '{"year": 2024, "month": 5, "day": 20}' \
     "https://guild.tarragon.be/api/external/v1/world/j5s9.../calendar"
```

### Python
```python
import requests

api_key = "vg_your_key"
headers = {"Authorization": f"Bearer {api_key}"}

# Get world calendar
response = requests.get(
    "https://guild.tarragon.be/api/external/v1/world/j5s9.../calendar",
    headers=headers
)
calendar_data = response.json()
print(f"Current Date: {calendar_data['calendar']['dynamic_data']}")
```

---

## Rate Limiting & Security
*   Keep your API key secret. If compromised, revoke it immediately from the dashboard.
*   API keys provide access to your private character data and worlds you own.
*   Currently, there are no strict rate limits, but please be mindful of the Convex deployment limits.

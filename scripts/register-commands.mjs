const APP_ID = "1479506068185944226"; // Get this from Discord Portal
const GUILD_ID = "878674783972261918"; // Optional: Use for instant updates in one server
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function registerCommands() {
  const url = GUILD_ID 
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        name: 'sessions',
        description: 'Show upcoming gaming sessions',
      },
      {
        name: 'character',
        description: 'Search for a character by name',
        options: [
          {
            name: 'name',
            description: 'The name of the character to find',
            type: 3, // STRING
            required: true,
          }
        ]
      },
      {
        name: 'world',
        description: 'Search for a world by name',
        options: [
          {
            name: 'name',
            description: 'The name of the world to find',
            type: 3, // STRING
            required: true,
          }
        ]
      }
    ]),
  });

  if (response.ok) {
    console.log('Successfully registered /sessions command!');
  } else {
    console.error('Error registering command:', await response.text());
  }
}

registerCommands();

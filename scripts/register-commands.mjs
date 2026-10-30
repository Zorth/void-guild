import fs from 'fs';
import path from 'path';

// Auto-read DISCORD_BOT_TOKEN from .env.local if not already in environment
let botToken = process.env.DISCORD_BOT_TOKEN;
if (!botToken) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^DISCORD_BOT_TOKEN=(.+)$/m);
      if (match) botToken = match[1].trim();
    }
  } catch {}
}

const APP_ID = process.env.DISCORD_APP_ID || "1479506068185944226";
// By default, register globally so commands work everywhere without duplicates
const GUILD_ID = process.env.DISCORD_GUILD_ID || null;
const BOT_TOKEN = botToken;

if (!BOT_TOKEN) {
  console.error("Error: DISCORD_BOT_TOKEN is not set in environment or .env.local");
  process.exit(1);
}

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
        name: 'session',
        description: 'Show upcoming sessions or search for one',
        options: [
          {
            name: 'world-date',
            description: 'Search for a session by world or date',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          }
        ]
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
            autocomplete: true,
          }
        ]
      },
      {
        name: 'world',
        description: 'Search for a world by name or list all worlds',
        options: [
          {
            name: 'name',
            description: 'The name of the world to find',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          }
        ]
      },
      {
        name: 'schedule',
        description: 'Show upcoming availability summary for the next 2 weeks',
      },
      {
        name: 'roll',
        description: 'Roll dice (default d100)',
        options: [
          {
            name: 'sides',
            description: 'Number of sides on the die (default 100)',
            type: 4, // INTEGER
            required: false,
          }
        ]
      },
      {
        name: 'bets',
        description: 'View your active Deathroll bets and turn status',
      },
      {
        name: 'deathroll',
        description: 'Issue a Deathroll gambling wager to an opponent or open challenge',
        options: [
          {
            name: 'character',
            description: 'Your character name',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
          {
            name: 'wager',
            description: 'Gold Piece (GP) wager amount',
            type: 4, // INTEGER
            required: true,
          },
          {
            name: 'opponent',
            description: 'Target character name (leave empty for open challenge)',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          },
          {
            name: 'max_roll',
            description: 'Starting max roll (default 100)',
            type: 4, // INTEGER
            required: false,
          }
        ]
      },
      {
        name: 'market',
        description: 'View active items and services on the Black Void market',
        options: [
          {
            name: 'query',
            description: 'Search filter for market listings',
            type: 3, // STRING
            required: false,
          }
        ]
      },
      {
        name: 'my-listings',
        description: 'View your active market listings and won auctions',
      },
      {
        name: 'ledger',
        description: 'View unclaimed gold, items, quests, and cuts across your characters',
      },
      {
        name: 'nethys',
        description: 'Lookup an item on Archives of Nethys (PF2e)',
        options: [
          {
            name: 'item_name',
            description: 'Item name to search on AoN',
            type: 3, // STRING
            required: true,
          }
        ]
      },
      {
        name: 'vote-quest',
        description: 'Suggest quest(s) or plotline(s) for voting with pinned reaction poll',
        options: [
          {
            name: 'option1',
            description: 'First quest or custom plotline (pick from list or type custom text)',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
          {
            name: 'option2',
            description: 'Second quest or custom plotline (optional for multiple choice)',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          },
          {
            name: 'option3',
            description: 'Third quest or custom plotline',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          },
          {
            name: 'option4',
            description: 'Fourth quest or custom plotline',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          },
          {
            name: 'option5',
            description: 'Fifth quest or custom plotline',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          }
        ]
      }
    ]),
  });

  if (response.ok) {
    console.log(`Successfully registered Discord commands (${GUILD_ID ? `Guild scope: ${GUILD_ID}` : 'Global scope'})!`);
    
    // Clear opposite scope to ensure zero duplicates
    if (GUILD_ID) {
      console.log('Clearing old global commands to eliminate duplicates...');
      const clearRes = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });
      console.log('Global cleanup status:', clearRes.status);
    } else {
      // If registering globally, clear any old guild-specific registrations on the primary server
      const defaultGuildId = "878674783972261918";
      console.log(`Clearing guild-scoped commands on ${defaultGuildId} to eliminate duplicates...`);
      const clearRes = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${defaultGuildId}/commands`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });
      console.log('Guild cleanup status:', clearRes.status);
    }
  } else {
    console.error('Error registering command:', await response.text());
  }
}

registerCommands();

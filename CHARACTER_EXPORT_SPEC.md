# Void Guild Character Data Export Specification (v1.0)
**Interface Standard between Pathbuilder 2e and Guild of The Void**

---

## 1. Overview & Architecture

This specification outlines the data model for character sheets exported from **Pathbuilder 2e** into the **Guild of The Void** database. 

Pathbuilder 2e internally exports character data in two primary ways:
1. **The Native JSON Model (`build`)**: The authoritative, fully-calculated tree containing base attributes, proficiencies, equipment, money, and feat identifiers.
2. **The Active Runtime State**: Live values that change during play (Current HP, Temporary HP, Shield HP, Dying/Wounded values, and Active Conditions).

The goal of this schema is to store **high-value combat and campaign data** (HP, AC, Saves, Skills, Conditions, Gold/Currency, Gear) and a **compact list of build abilities/feats** without bloating the database with descriptive rulebook text.

---

## 2. Target Database Schema (Proposed `characterDetails`)

This object can be attached to the existing character document (`/character/:characterId`) or stored in a dedicated sub-collection.

```typescript
interface CharacterSheetDetails {
  // Identity & Meta
  characterId: string;         // Void Guild character _id
  pathbuilderId?: number;      // Optional Pathbuilder 2e JSON ID
  system: "PF2e";
  name: string;
  level: number;
  xp: number;
  ancestry: string;
  heritage: string;
  background: string;
  class: string;
  dualClass?: string | null;
  keyAbility: "str" | "dex" | "con" | "int" | "wis" | "cha";
  alignment?: string;
  deity?: string;
  size: string;                // e.g. "Medium"
  speed: number;               // Base + bonuses in feet

  // 1. Health & Defenses
  hitPoints: {
    max: number;
    current: number;
    temporary: number;
    dieSize?: number;          // Class HD (e.g. 8, 10, 12)
    ancestryHP: number;
    classHP: number;
    bonusHP: number;
  };
  armorClass: {
    total: number;
    shieldBonus: number;       // +2 when raised
    unarmoredProf: number;     // 0=Untrained, 2=Trained, 4=Expert, 6=Master, 8=Legendary
    equippedArmorName?: string;
    shieldHardness?: number;
    shieldCurrentHP?: number;
    shieldMaxHP?: number;
  };

  // 2. Saving Throws & Perception
  saves: {
    fortitude: SaveDetail;
    reflex: SaveDetail;
    will: SaveDetail;
    perception: SaveDetail;
  };

  // 3. Ability Scores
  abilities: {
    str: number; // e.g. 18 (+4)
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };

  // 4. Skills
  skills: Record<string, SkillDetail>; // Standard skills + Lore skills

  // 5. Conditions & Active Effects
  conditions: ActiveCondition[];

  // 6. Currency & Wealth
  money: {
    cp: number;
    sp: number;
    gp: number;
    pp: number;
    totalInGold: number;       // Calculated: gp + (pp*10) + (sp/10) + (cp/100)
  };

  // 7. Equipment & Weapons (Clean inventory)
  gear: {
    weapons: EquippedWeapon[];
    armor: EquippedArmor[];
    equipment: InventoryItem[];
  };

  // 8. Build Features & Feats (Names & choices only, no long text descriptions)
  buildSummary: {
    classFeatures: string[];    // e.g. ["Exploit Vulnerability", "Implement: Chalice", "Esoteric Lore"]
    ancestryFeats: string[];    // e.g. ["Ageless Spirit", "Draconic Sight"]
    classFeats: string[];       // e.g. ["Sentinel Dedication", "Divine Disharmony"]
    skillFeats: string[];       // e.g. ["Arcane Sense", "Terrifying Resistance"]
    generalFeats: string[];     // e.g. ["Toughness", "Fleet"]
    languages: string[];
    specialResistances?: string[];
  };

  lastSyncedAt: number;        // Unix epoch timestamp
}
```

---

## 3. Sub-Structures Breakdown

### 3.1 Saves & Skills

Proficiencies in Pathbuilder are numerically encoded:
- `0`: Untrained
- `2`: Trained
- `4`: Expert
- `6`: Master
- `8`: Legendary

```typescript
interface SaveDetail {
  bonus: number;               // Total calculated roll modifier (e.g. +14)
  proficiency: "U" | "T" | "E" | "M" | "L";
  profValue: 0 | 2 | 4 | 6 | 8;
  itemBonus?: number;
}

interface SkillDetail {
  name: string;                // e.g. "Acrobatics", "Lore: Esoteric"
  modifier: number;            // Total roll bonus (e.g. +12)
  proficiency: "U" | "T" | "E" | "M" | "L";
  ability: "str" | "dex" | "con" | "int" | "wis" | "cha";
  isLore?: boolean;
}
```

### 3.2 Conditions (Live status)

Pathbuilder displays conditions under `.condition-name` and in `hashMapActiveConditions`:

```typescript
interface ActiveCondition {
  name: string;                // e.g. "Frightened", "Clumsy", "Dying", "Wounded"
  value?: number;              // e.g. 2 for Frightened 2, or null for Blinded
}
```

### 3.3 Gear & Weapons

```typescript
interface EquippedWeapon {
  name: string;                // e.g. "+1 Striking Bastard Sword"
  die: string;                 // e.g. "1d8" or "1d12"
  damageType: "B" | "P" | "S"; // Bludgeoning, Piercing, Slashing
  attackBonus: number;         // e.g. +13
  potency: number;             // +1, +2, +3
  striking: string;            // "Striking", "Greater Striking", or null
  runes: string[];             // e.g. ["Flaming", "Ghost Touch"]
  traits: string[];            // e.g. ["Two-Hand d12", "Versatile S"]
  qty: number;
}

interface EquippedArmor {
  name: string;                // e.g. "Breastplate"
  acBonus: number;
  potency: number;             // +1, +2, +3
  resilient: string;           // "Resilient", etc.
  runes: string[];
  worn: boolean;
  qty: number;
}

interface InventoryItem {
  name: string;
  qty: number;
  bulk?: string;               // e.g. "L", "1", "-"
  container?: string;          // e.g. "Backpack", "Belt Pouch"
}
```

---

## 4. How the Extension Extracts This from Pathbuilder

The extension has two complimentary methods to pull this data:

### Method A: Native Export Object (Most Complete)
From within the page context, calling Pathbuilder's export serializer:
```javascript
// In Pathbuilder web application context:
const charObj = window.__mainAppInstance.mgo_1; // Active Character Model
const exporter = new Ft(window.__mainAppInstance.zgp(), charObj);
const fullJsonString = exporter.jg7(-1);
const exportData = JSON.parse(fullJsonString);
```
This returns the full canonical JSON containing:
- `exportData.build.attributes` (HP, Speed, Base HP)
- `exportData.build.acTotal` (AC breakdown)
- `exportData.build.proficiencies` (all saves, weapon/armor tiers, and skill proficiencies)
- `exportData.build.abilities` (Ability scores)
- `exportData.build.money` (`cp`, `sp`, `gp`, `pp`)
- `exportData.build.weapons`, `armor`, `equipment`
- `exportData.build.feats` (clean array `[ [featName, detail, type, level], ... ]`)

### Method B: Live DOM Scraping (Zero-Dependency & Fast)
If accessing internal Kotlin/JS objects isn't desirable, the DOM already renders all of this:
- **HP**: Read from `#section-ac-hp .healthbar` or `.ac-holder`
- **AC**: Read from `.ac-text` (e.g. `24`)
- **Saves**: `#section-defense .saves-button`
- **Conditions**: Read elements with class `.condition-name` inside `#section-conditions`
- **Money**: Elements with class `.table-money` (`.button-money` text)
- **Skills**: Elements with class `.section-skill-name` and their sibling roll bonuses.

---

## 5. Proposed External API Endpoint for Mutations

In Guild of The Void backend (`guild.tarragon.be`):

```http
POST /api/external/v1/character/:characterId/sheet
Authorization: Bearer vg_your_api_key_here
Content-Type: application/json
```

**Payload**:
```json
{
  "ac": 24,
  "hp": {
    "current": 54,
    "max": 68,
    "temp": 0
  },
  "money": {
    "cp": 12,
    "sp": 8,
    "gp": 145,
    "pp": 3
  },
  "conditions": [
    { "name": "Wounded", "value": 1 }
  ],
  "gear": [
    { "name": "Bastard Sword", "qty": 1 },
    { "name": "Breastplate", "qty": 1 },
    { "name": "Healing Potion (Lesser)", "qty": 2 }
  ],
  "buildSummary": {
    "feats": ["Sentinel Dedication", "Toughness", "Fleet", "Ageless Spirit"],
    "specials": ["Exploit Vulnerability", "Implement: Chalice", "Implement: Shield"]
  }
}
```

### Security & Integrity:
- As specified in `API.md`, character **XP** and **Level** remain protected and are **not** overwritten by this push endpoint.
- Only authenticated character owners can update their character's sheet details.

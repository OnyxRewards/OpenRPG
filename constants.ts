import { Skill } from './types';

export const COLORS = {
  GROUND: '#2d3821', // Dark green
  PLAYER_SKIN: '#8d5524',
  PLAYER_SHIRT: '#3e4637', // Ranger green
  PLAYER_PANTS: '#2d2d2d',
  
  // Scenery
  TREE_TRUNK: '#4a3728',
  TREE_LEAVES_DARK: '#1e3818',
  TREE_LEAVES_LIGHT: '#2d4c1e',
  ROCK_BASE: '#4a4a4a',
  ROCK_HIGHLIGHT: '#666666',
  FLOWER_PETAL: '#e0c040',
  WATER_DEEP: '#1e3b4d',
  WATER_SURFACE: '#4fa4b8',
  
  // Props
  WOOD_LIGHT: '#855E42',
  WOOD_DARK: '#5C4033',
  STONE_RUIN: '#5a5a5a',
  PATH_DIRT: '#5d4e38',
  FIRE_ORANGE: '#ff6600',
  FIRE_YELLOW: '#ffcc00',
  MUSHROOM_RED: '#d32f2f',
  MUSHROOM_STEM: '#e0e0e0',

  // OSRS UI Colors
  UI_STONE_DARK: '#383023', // Main container bg
  UI_STONE_LIGHT: '#4a3f2f', // Highlights
  UI_BORDER_LIGHT: '#5a4f3d',
  UI_BORDER_DARK: '#221d15',
  UI_BUTTON_HOVER: '#5e5242',
  
  // Chatbox
  CHAT_BG: 'rgba(194, 178, 128, 0.6)', // Transparent parchment
  CHAT_TEXT: '#0000ff', // Blue text for standard messages
  CHAT_ACTION: '#cc00ff', // Purple for actions
  
  // Inventory
  INV_BG: '#3e3529',
  
  // Combat
  HP_BAR_BG: '#330000',
  HP_BAR_FILL: '#00ff00',
  HP_BAR_LOW: '#ff0000',
  DAMAGE_SPLAT: '#aa0000',
  
  TEXT_YELLOW: '#ffff00',
  TEXT_ORANGE: '#ff981f',
  
  LOG: '#5c4033',
  LEAVES: '#1e3818',
  WATER: '#006994',
  PATH: '#544e44',
};

export const XP_TABLE = {
  LOG_BALANCE: 15,
  OBSTACLE_NET: 25,
  RAKE: 5,
  PLANT: 10,
  HARVEST: 50,
  COMBAT_HIT: 4, // XP per hit
  COMBAT_KILL: 20, // XP bonus for kill
};

export const LEVEL_FORMULA = (xp: number) => Math.floor(0.25 * Math.floor(Math.sqrt(xp * 5 + 100)) + 1);

// Simple max hit formula based on melee level
export const MAX_HIT_FORMULA = (level: number) => Math.floor(1 + (level / 2));

export const SKILL_ICONS: Record<Skill, string> = {
  [Skill.AGILITY]: '🏃',
  [Skill.FARMING]: '🌱',
  [Skill.MELEE]: '⚔️',
  [Skill.HITPOINTS]: '❤️',
};
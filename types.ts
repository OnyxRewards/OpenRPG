import * as THREE from 'three';

export enum Skill {
  AGILITY = 'Agility',
  FARMING = 'Farming',
  MELEE = 'Melee',
  HITPOINTS = 'Hitpoints'
}

export interface PlayerStats {
  agilityXp: number;
  farmingXp: number;
  meleeXp: number;
  hitpointsXp: number;
  currentHp: number;
  maxHp: number;
}

export interface GameMessage {
  id: string;
  text: string;
  type: 'info' | 'action' | 'examine' | 'combat' | 'danger';
  timestamp: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export enum FarmingStage {
  WEEDS = 0,
  EMPTY = 1,
  SEEDS = 2,
  GROWING_1 = 3,
  GROWING_2 = 4,
  READY = 5
}

export interface Enemy {
  id: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  position: THREE.Vector3;
  respawnTime: number; // timestamp when it comes back, 0 if alive
  isDead: boolean;
}

export type ClickAction = (pos: Position) => void;

export interface InteractableProps {
  position: [number, number, number];
  onInteract: () => void;
  onExamine: () => void;
  isPlayerClose: boolean;
  label: string;
}
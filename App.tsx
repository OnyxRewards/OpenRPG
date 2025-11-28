import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameScene } from './components/GameScene';
import { Interface } from './components/Interface';
import { PlayerStats, GameMessage, Enemy } from './types';

function App() {
  const [stats, setStats] = useState<PlayerStats>({
    agilityXp: 0,
    farmingXp: 0,
    meleeXp: 0,
    hitpointsXp: 240, // Starts at Level 10
    currentHp: 10,
    maxHp: 10,
  });

  const [messages, setMessages] = useState<GameMessage[]>([
    { id: 'init', text: 'Welcome to VoxelScape.', type: 'info', timestamp: Date.now() }
  ]);

  const [hoverAction, setHoverAction] = useState<string | null>(null);
  
  // Navigation State
  const [playerTarget, setPlayerTarget] = useState(new THREE.Vector3(0, 0, 0));

  // Enemy State (Lifted for Minimap access)
  const [enemies, setEnemies] = useState<Enemy[]>([
    { id: '1', name: 'Goblin', level: 2, currentHp: 5, maxHp: 5, position: new THREE.Vector3(5, 0, -5), respawnTime: 0, isDead: false },
    { id: '2', name: 'Goblin', level: 2, currentHp: 5, maxHp: 5, position: new THREE.Vector3(8, 0, -3), respawnTime: 0, isDead: false },
    { id: '3', name: 'Goblin', level: 2, currentHp: 5, maxHp: 5, position: new THREE.Vector3(2, 0, -7), respawnTime: 0, isDead: false },
  ]);

  const addMessage = useCallback((text: string, type: GameMessage['type']) => {
    setMessages((prev) => {
      const newMsg = { id: Date.now().toString() + Math.random(), text, type, timestamp: Date.now() };
      return [...prev.slice(-15), newMsg];
    });
  }, []);

  const handleMoveTo = useCallback((pos: THREE.Vector3) => {
    setPlayerTarget(pos);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0 cursor-crosshair">
        <GameScene 
          stats={stats} 
          setStats={setStats} 
          addMessage={addMessage}
          setHoverAction={setHoverAction}
          playerTarget={playerTarget}
          setPlayerTarget={setPlayerTarget}
          enemies={enemies}
          setEnemies={setEnemies}
        />
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Interface 
          stats={stats} 
          messages={messages} 
          currentAction={hoverAction}
          onNavigate={handleMoveTo}
          playerTarget={playerTarget}
          enemies={enemies}
        />
      </div>
    </div>
  );
}

export default App;
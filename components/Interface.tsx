import React, { useState } from 'react';
import * as THREE from 'three';
import { PlayerStats, GameMessage, Enemy } from '../types';
import { LEVEL_FORMULA } from '../constants';

interface InterfaceProps {
  stats: PlayerStats;
  messages: GameMessage[];
  currentAction: string | null;
  onNavigate: (pos: THREE.Vector3) => void;
  playerTarget: THREE.Vector3;
  enemies: Enemy[];
}

const SideStone = ({ icon, active, onClick }: { icon: string, active: boolean, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`
      cursor-pointer w-9 h-8 sm:w-10 sm:h-9 flex items-center justify-center
      border border-[#221d15] rounded-sm
      ${active ? 'bg-[#4a1c1c]' : 'bg-[#383023] hover:bg-[#4a3f2f]'}
      transition-colors duration-100 shadow-md
    `}
  >
    <span className="text-xl sm:text-2xl drop-shadow-md filter select-none">{icon}</span>
  </div>
);

// Helper for item definitions
const INVENTORY_ITEMS = [
  { id: 0, icon: '🧹', name: 'Rake', desc: 'For clearing weeds.' },
  { id: 1, icon: '🌰', name: 'Herb Seeds', desc: 'Ready to plant.' },
  { id: 2, icon: '💧', name: 'Watering Can', desc: 'Keeps plants hydrated.' },
  { id: 3, icon: '🗡️', name: 'Bronze Sword', desc: 'A basic weapon.' },
];

export const Interface: React.FC<InterfaceProps> = ({ stats, messages, currentAction, onNavigate, playerTarget, enemies }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'stats' | null>('inventory');
  
  // UI State for Collapsing
  const [isMapOpen, setIsMapOpen] = useState(true);

  // Tooltip State
  const [tooltip, setTooltip] = useState<{name: string, desc: string, x: number, y: number} | null>(null);

  const farmingLevel = LEVEL_FORMULA(stats.farmingXp);
  const meleeLevel = LEVEL_FORMULA(stats.meleeXp);
  const hpLevel = LEVEL_FORMULA(stats.hitpointsXp);
  const totalLevel = farmingLevel + meleeLevel + hpLevel;

  const handleTabClick = (tab: 'inventory' | 'stats') => {
      if (activeTab === tab) {
          setActiveTab(null); // Collapse if already open
      } else {
          setActiveTab(tab);
      }
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Calculate click position relative to center of orb
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Map pixel delta to world units offset
      const scale = 0.5;
      const dx = (x - centerX) * scale;
      const dy = (y - centerY) * scale;

      // New position is current target + delta
      const worldX = playerTarget.x + dx;
      const worldZ = playerTarget.z + dy;

      onNavigate(new THREE.Vector3(worldX, 0, worldZ));
  };

  // Convert enemy world position to minimap pixel offset
  // Minimap is approx 136px x 136px visually (orb). Center is (68, 68).
  // Scale: 1 world unit = 2 pixels (approx)
  const getMinimapOffset = (enemyPos: THREE.Vector3) => {
      const dx = enemyPos.x - playerTarget.x;
      const dz = enemyPos.z - playerTarget.z;
      const scale = 2; // px per unit
      return { left: 50 + (dx * scale) + '%', top: 50 + (dz * scale) + '%' };
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-sans overflow-hidden p-2 sm:p-4">
      
      {/* --- TOP ROW --- */}
      <div className="flex justify-between items-start w-full">
        
        {/* Top Left: XP Tracker (Always Visible) */}
        <div className="pointer-events-auto flex flex-col gap-2 animate-fadeIn">
           <div className="bg-[#383023] border-2 border-[#5a4f3d] p-1 px-3 shadow-[0_4px_6px_rgba(0,0,0,0.5)] rounded-sm min-w-[140px]">
             <div className="text-[#ff981f] text-xs font-bold mb-1 border-b border-[#5a4f3d] flex justify-between items-center">
                <span>XP Tracker</span>
                <span className="text-[10px] text-gray-400">Total: {totalLevel}</span>
             </div>
             <div className="text-white text-xs flex justify-between items-center hover:bg-white/5 px-1 rounded">
                <span className="flex items-center gap-1">🌱 Farming</span>
                <span className="text-yellow-400 font-mono">{stats.farmingXp.toLocaleString()}</span>
             </div>
             <div className="text-white text-xs flex justify-between items-center hover:bg-white/5 px-1 rounded">
                <span className="flex items-center gap-1">⚔️ Melee</span>
                <span className="text-yellow-400 font-mono">{stats.meleeXp.toLocaleString()}</span>
             </div>
             <div className="text-white text-xs flex justify-between items-center hover:bg-white/5 px-1 rounded">
                <span className="flex items-center gap-1">❤️ Hitpoints</span>
                <span className="text-yellow-400 font-mono">{stats.hitpointsXp.toLocaleString()}</span>
             </div>
           </div>

           {currentAction && (
             <div className="mt-2 pointer-events-none text-white text-base font-bold drop-shadow-[2px_2px_0_rgba(0,0,0,1)] stroke-black tracking-wide">
               {currentAction}
             </div>
           )}
        </div>

        {/* Top Right: Minimap (Collapsible) */}
        <div className="pointer-events-auto flex flex-col items-end">
           <div className={`relative transition-all duration-300 ${isMapOpen ? 'w-36 h-36 opacity-100' : 'w-10 h-10 opacity-80'}`}>
              
              {isMapOpen ? (
                <>
                   {/* Full Orb */}
                   <div 
                        className="absolute inset-0 rounded-full bg-[#1a1510] border-4 border-[#383023] shadow-xl overflow-hidden cursor-crosshair active:scale-95 transition-transform" 
                        onClick={handleMinimapClick}
                        title="Click to walk relative to position"
                    >
                      <div className="w-full h-full bg-[#2d3821] opacity-80 relative">
                         {/* Player Marker (Center) */}
                         <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-sm border border-black z-20"></div>
                         
                         {/* Enemy Markers */}
                         {enemies.map(e => !e.isDead && (
                             <div 
                                key={e.id}
                                className="absolute w-1.5 h-1.5 bg-red-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-black z-10"
                                style={getMinimapOffset(e.position)}
                             ></div>
                         ))}

                         {/* Static decorative markers */}
                         <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-black/20"></div>
                         <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/20"></div>
                      </div>
                   </div>
                   {/* HP Orb */}
                   <div className="absolute -left-2 top-4 w-10 h-10 rounded-full bg-[#383023] border border-[#5a4f3d] flex flex-col items-center justify-center shadow-md z-30 pointer-events-none">
                      <div className="text-[8px] text-[#ff981f] font-bold">HP</div>
                      <div className={`text-xs font-bold ${stats.currentHp < 5 ? 'text-red-500' : 'text-green-500'}`}>
                        {stats.currentHp}
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-[#2a241b] border border-[#5a4f3d] text-white flex items-center justify-center font-serif font-bold text-sm shadow-md z-30 cursor-pointer hover:text-yellow-400" onClick={() => setIsMapOpen(false)}>N</div>
                </>
              ) : (
                 <div className="w-10 h-10 rounded-full bg-[#383023] border-2 border-[#5a4f3d] flex items-center justify-center cursor-pointer shadow-lg hover:bg-[#4a3f2f]" onClick={() => setIsMapOpen(true)}>
                    <span className="text-lg">🌍</span>
                 </div>
              )}
           </div>
        </div>
      </div>


      {/* --- BOTTOM ROW --- */}
      <div className="flex items-end justify-between w-full mt-auto gap-4">
        
        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Bottom Right: OSRS "Stones" Layout */}
        <div className="pointer-events-auto flex flex-col items-end">
           
           {/* Collapsible Drawer Content */}
           <div className={`
              ${activeTab ? 'h-[280px] sm:h-[300px] opacity-100 border-[3px]' : 'h-0 opacity-0 border-0'} 
              w-[220px] sm:w-[240px] transition-all duration-200 
              bg-[#383023] border-[#221d15] 
              flex flex-col shadow-2xl overflow-hidden mb-1
           `}>
               {/* Main Content Area */}
              <div className="flex-1 p-2 bg-[#3e3529] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] overflow-hidden relative">
                 
                 {/* Inventory Grid */}
                 {activeTab === 'inventory' && (
                   <div className="grid grid-cols-4 grid-rows-7 gap-1 h-full">
                      {[...Array(28)].map((_, i) => {
                        const item = INVENTORY_ITEMS.find(it => it.id === i);
                        return (
                          <div 
                            key={i} 
                            className="relative rounded-sm hover:bg-white/10 cursor-pointer transition-colors group"
                            onMouseEnter={(e) => {
                                if (item) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltip({ name: item.name, desc: item.desc, x: rect.left - 200, y: rect.top });
                                }
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                             {item && (
                                <span className="absolute inset-0 flex items-center justify-center text-xl sm:text-2xl drop-shadow-md filter hover:brightness-110">
                                    {item.icon}
                                </span>
                             )}
                          </div>
                        );
                      })}
                   </div>
                 )}

                 {/* Stats View */}
                 {activeTab === 'stats' && (
                   <div className="flex flex-col gap-1 text-xs font-bold text-yellow-400 h-full overflow-y-auto custom-scrollbar">
                      
                      {/* Combat Section */}
                      <div className="text-[#ff981f] text-[10px] uppercase tracking-wider mb-0.5 mt-1 border-b border-[#5a4f3d]">Combat</div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="bg-[#2a241b] p-2 flex items-center justify-between border border-[#5a4f3d] shadow-sm hover:bg-[#4a3f2f] cursor-help" title={`XP: ${stats.hitpointsXp}`}>
                            <span className="flex items-center gap-1.5">❤️ HP</span> 
                            <span>{hpLevel}</span>
                        </div>
                        <div className="bg-[#2a241b] p-2 flex items-center justify-between border border-[#5a4f3d] shadow-sm hover:bg-[#4a3f2f] cursor-help" title={`XP: ${stats.meleeXp}`}>
                            <span className="flex items-center gap-1.5">⚔️ Melee</span> 
                            <span>{meleeLevel}</span>
                        </div>
                        <div className="bg-[#2a241b] p-2 flex items-center justify-between border border-[#5a4f3d] shadow-sm hover:bg-[#4a3f2f] opacity-70" title="Coming Soon">
                            <span className="flex items-center gap-1.5">🏹 Range</span> 
                            <span>1</span>
                        </div>
                        <div className="bg-[#2a241b] p-2 flex items-center justify-between border border-[#5a4f3d] shadow-sm hover:bg-[#4a3f2f] opacity-70" title="Coming Soon">
                            <span className="flex items-center gap-1.5">✨ Magic</span> 
                            <span>1</span>
                        </div>
                      </div>

                      {/* Skills Section */}
                      <div className="text-[#ff981f] text-[10px] uppercase tracking-wider mb-0.5 mt-2 border-b border-[#5a4f3d]">Skills</div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="bg-[#2a241b] p-2 flex items-center justify-between border border-[#5a4f3d] shadow-sm hover:bg-[#4a3f2f] cursor-help" title={`XP: ${stats.farmingXp}`}>
                            <span className="flex items-center gap-1.5">🌱 Farming</span> 
                            <span>{farmingLevel}</span>
                        </div>
                      </div>
                   </div>
                 )}
              </div>
           </div>

           {/* Stones / Icons Row */}
           <div className="grid grid-cols-7 gap-0.5 bg-[#221d15] p-0.5 rounded-sm">
               {/* Only render Stones for implemented features */}
               <SideStone icon="⚔️" active={false} onClick={() => {}} /> {/* Attack Style (Disabled) */}
               <SideStone icon="📊" active={activeTab === 'stats'} onClick={() => handleTabClick('stats')} />
               <SideStone icon="🎒" active={activeTab === 'inventory'} onClick={() => handleTabClick('inventory')} />
               <SideStone icon="🛡️" active={false} onClick={() => {}} /> {/* Armor (Disabled) */}
               <SideStone icon="📜" active={false} onClick={() => {}} /> {/* Quests (Disabled) */}
               <SideStone icon="🙏" active={false} onClick={() => {}} /> {/* Prayer (Disabled) */}
               <SideStone icon="✨" active={false} onClick={() => {}} /> {/* Magic (Disabled) */}
           </div>
        </div>

      </div>

      {/* Tooltip Portal */}
      {tooltip && (
          <div 
            className="fixed z-50 bg-[#383023] border border-[#ff981f] p-2 shadow-xl pointer-events-none w-40 animate-fadeIn"
            style={{ left: Math.max(10, tooltip.x), top: tooltip.y }}
          >
              <div className="text-[#ff981f] font-bold text-xs border-b border-[#5a4f3d] pb-1 mb-1">{tooltip.name}</div>
              <div className="text-white text-[10px] leading-tight">{tooltip.desc}</div>
          </div>
      )}

    </div>
  );
};
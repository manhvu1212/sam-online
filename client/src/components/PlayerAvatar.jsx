import React, { memo } from 'react'; // 1. Import memo

const PlayerAvatar = memo(function PlayerAvatar({ player, isMe, isTurn, isPassed, positionClass }) {
    return (
        <div className={`absolute ${positionClass} flex flex-col items-center z-20`}>
            <div className="relative">
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=e4e4e7`}
                    className={`
            ${isMe ? 'w-16 h-16' : 'w-12 h-12'} rounded-full border-[1.5px] bg-zinc-800 object-cover
            ${isTurn ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'border-zinc-700'} 
            ${isPassed ? 'opacity-40 grayscale' : 'opacity-100'} 
            transition-all duration-300
          `}
                    alt={player.name}
                />
                {player.isBao && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] px-1 py-0.5 rounded font-black animate-pulse border border-red-400 z-40">BÁO</span>
                )}
                {isPassed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <span className="text-[8px] sm:text-[10px] font-black text-zinc-300 rotate-12 drop-shadow-md">BỎ LƯỢT</span>
                    </div>
                )}
            </div>
            <div className={`mt-1.5 bg-zinc-900/90 backdrop-blur border ${isMe ? 'border-amber-600/50' : 'border-zinc-700/50'} px-2 py-0.5 rounded text-center shadow-lg ${isPassed ? 'opacity-50' : ''}`}>
                <p className={`text-[10px] font-bold truncate max-w-[70px] ${isMe ? 'text-amber-400' : 'text-zinc-300'}`}>{player.name}</p>
                {!isMe && <p className="text-[9px] text-amber-500/80 font-bold leading-none mt-0.5">{player.cardCount} lá</p>}
            </div>
        </div>
    );
});

export default PlayerAvatar
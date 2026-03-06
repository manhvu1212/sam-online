import React, { memo } from 'react'; // 1. Import memo

const PlayerAvatar = memo(function PlayerAvatar({ player, matchPlayer, balance, isMe, isTurn, positionClass, positionStyle, isSamPlayer }) {
    return (
        <div className={`absolute ${positionClass} flex flex-col items-center z-20 transition-all duration-500 w-12 md:w-20`}
            style={positionStyle}
        >
            <div className="relative">
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=e4e4e7`}
                    className={`
                                w-12 h-12 md:w-20 md:h-20 rounded-full border-[1.5px] bg-zinc-800 object-cover
                                ${isTurn ? 'bg-yellow-400 border-2 border-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.8)] ring-4 ring-yellow-400/30' : 'border-zinc-700'} 
                                ${matchPlayer && matchPlayer.passTurn ? 'opacity-40 grayscale' : 'opacity-100'} 
                                transition-all duration-300
                            `}
                    alt={player.name}
                />

                {(player.status == "OFFLINE" || matchPlayer?.passTurn) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <span className="text-[8px] sm:text-[10px] font-black text-zinc-300 rotate-12 drop-shadow-md"> {player.status == "OFFLINE" ? "OFFLINE" : "BỎ LƯỢT"}</span>
                    </div>
                )}
                {/* HIỂN THỊ ICON BÁO SÂM */}
                {isSamPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full pt-10">
                        <span className=" bg-red-600 text-zinc-100 text-[10px] px-1.5 py-0.5 rounded font-black border-2 border-amber-400 z-50 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-bounce">
                            SÂM
                        </span>
                    </div>

                )}
            </div>

            {!isMe && matchPlayer?.isReady && (
                <span className="absolute -top-1 -left-1 bg-yellow-600 text-white text-[6px] md:text-[10px] px-1 py-0.5 rounded font-black border border-yellow-400 z-40">READY</span>
            )}

            {!isMe && matchPlayer?.isBao
                ? (<span className="absolute -top-2 -right-1 bg-red-600 text-white text-[8px] md:text-[14px] px-1 py-0.5 rounded font-black animate-pulse border border-red-400 z-40">BÁO</span>)
                : ((!isMe && matchPlayer?.cardCount > 0) && <span className="absolute -top-2 -right-1 bg-gray-600 text-white text-[8px] md:text-[14px] px-1 py-0.5 rounded font-black border border-red-400 z-40">{matchPlayer?.cardCount || 0}</span>)
            }
            <div className={`mt-1.5 bg-zinc-900/90 backdrop-blur border ${isMe ? 'border-amber-600/50' : 'border-zinc-700/50'} px-2 py-0.5 rounded text-center shadow-lg ${matchPlayer?.passTurn ? 'opacity-50' : ''}`}>
                <p className={`text-[13px] md:text-[18px] font-bold truncate max-w-[60px] ${isMe ? 'text-amber-400' : 'text-zinc-300'}`}>{player.name}</p>
                {(balance != 0) && <p className="text-[12px] md:text-[15px] text-amber-500/80 font-bold truncate leading-none mt-0.5">{(balance / 1000)} k</p>}
            </div>

        </div>
    );
});

export default PlayerAvatar
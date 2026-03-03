import React, { memo } from 'react'; // 1. Import memo
import TimerDisplay from './TimerDisplay';

const ActionBar = memo(function ActionBar({
    socket,
    room,
    isMyTurn,
    isValidMove,
    onPassTurn,
    onPlayCards
}) {
    // Chỉ hiện thanh này khi đang trong ván và đến đúng lượt của mình
    if (room.status !== 'PLAYING' || !isMyTurn) return null;

    return (
        <div className="pointer-events-auto flex gap-3 mb-10 sm:mb-12">
            <TimerDisplay socket={socket} type="badge" />

            {room.lastMove && (
                <button onClick={onPassTurn} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 px-6 py-2.5 rounded font-bold text-sm tracking-wider shadow-lg transition-colors">
                    BỎ LƯỢT
                </button>
            )}

            <button
                onClick={onPlayCards}
                disabled={!isValidMove}
                className={`px-8 py-2.5 rounded font-black text-sm tracking-wider transition-all duration-300 ${isValidMove
                        ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                    }`}
            >
                ĐÁNH BÀI
            </button>
        </div>
    );
});

export default ActionBar;
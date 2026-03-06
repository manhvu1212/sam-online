import React, { memo } from 'react';

const RoomHeader = memo(function RoomHeader({ code, bet }) { // 2. Bọc memo vào    
    return (
        <>
            <div className="absolute top-3 left-3 z-200 pointer-events-auto">
                <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800/50 rounded p-1.5 shadow-md flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Bàn VIP</span>
                    <span className="text-sm text-amber-500 font-black tracking-widest">{code}</span>
                </div>
            </div>
            <div className="absolute top-3 right-3 z-200 pointer-events-auto flex items-center gap-2">
                <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800/50 rounded px-2 py-1 shadow-md">
                    <span className="text-[10px] text-zinc-400">Cược: <span className="text-amber-500 font-bold">{bet / 1000}k</span></span>
                </div>
                <button onClick={() => window.location.reload()} className="bg-zinc-800 border border-red-900/50 text-red-500 rounded px-3 py-1 text-[10px] font-bold shadow-md hover:bg-zinc-700 transition-colors">
                    THOÁT
                </button>
            </div>
        </>
    );
});

export default RoomHeader;
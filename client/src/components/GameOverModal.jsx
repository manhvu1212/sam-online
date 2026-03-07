import React, { memo } from 'react';
import Card from './Card';

const GameOverModal = memo(function GameOverModal({ user, results, onReadyNext }) {
    if (!results) return null;

    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 0.7 : 0.9

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md 
                        flex p-4 pt-15
                        items-center justify-center">

            <div className="bg-zinc-900 border border-amber-600/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] 
                            max-h-full flex flex-col
                            w-full max-w-2xl overflow-hidden">

                <div className="shrink-0 bg-amber-600 py-3 text-center shadow-md border-b border-amber-500">
                    <h2 className="text-zinc-950 font-black text-xl tracking-[0.2em] uppercase drop-shadow-sm">TỔNG KẾT VÁN ĐẤU</h2>
                </div>

                {/* Tiêu đề các cột */}
                <div className="shrink-0 grid grid-cols-12 gap-2 px-6 py-2 border-b border-zinc-800 text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                    <div className="col-span-5">Người chơi</div>
                    <div className="col-span-3 text-right">Ván này</div>
                    <div className="col-span-4 text-right text-amber-500/50">Sổ nợ (Tổng)</div>
                </div>

                {/* Thông tin */}
                <div className="flex-1 p-4 sm:px-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                    {results.map((r, index) => {
                        const isMe = r.id === user.id;
                        return (
                            <div
                                key={r.id}
                                className={`flex flex-col p-3 rounded-xl border ${r.isWinner
                                    ? 'bg-amber-500/10 border-amber-500/50 shadow-inner'
                                    : 'bg-zinc-800/30 border-zinc-800'
                                    } ${isMe ? 'ring-1 ring-zinc-400' : ''}`}
                            >
                                {/* DÒNG 1: THÔNG TIN VÀ TIỀN BẠC */}
                                <div className="grid grid-cols-12 gap-2 items-center w-full">
                                    <div className="col-span-5 flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm sm:text-base text-zinc-200 truncate">
                                                {index + 1}. {r.name} {isMe && '(Bạn)'}
                                            </span>
                                            {r.isWinner && <span className="text-[10px] bg-amber-500 text-zinc-900 px-1.5 py-0.5 rounded font-black tracking-widest animate-pulse">THẮNG</span>}
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-zinc-500 font-semibold truncate">{r.detail}</span>
                                    </div>

                                    <div className="col-span-3 text-right flex flex-col">
                                        <span className={`font-black text-sm sm:text-base ${r.moneyChange > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                            {r.moneyChange > 0 ? '+' : ''}{(r.moneyChange / 1000)}k
                                        </span>
                                    </div>

                                    <div className="col-span-4 text-right flex flex-col justify-center">
                                        <div className="bg-zinc-950 border border-zinc-800 py-1 px-2 rounded flex justify-end items-center gap-1 shadow-inner">
                                            <span className="text-[10px] text-zinc-500">Tổng:</span>
                                            <span className={`font-black text-base sm:text-lg tracking-wide ${r.totalScore > 0 ? 'text-green-500' : r.totalScore < 0 ? 'text-red-500' : 'text-zinc-400'
                                                }`}>
                                                {r.totalScore > 0 ? '+' : ''}{(r.totalScore / 1000)}k
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* DÒNG 2: LẬT BÀI MINH BẠCH (Chỉ hiện cho người thua) */}
                                {!r.isWinner && r.cards && r.cards.length > 0 && (
                                    <div id={`result-cards-container-${r.id}`} className="mt-3 pt-3 border-t border-zinc-700/50 flex flex-col gap-1.5">
                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Bài còn lại ({r.cardCount} lá):</span>

                                        {/* Thẻ cha bọc toàn bộ các lá bài */}
                                        <div className="flex w-full max-w-full">
                                            {[...r.cards].sort((a, b) => a.rank - b.rank).map((c, i) => {
                                                // Kiểm tra xem đây có phải lá cuối cùng không
                                                const isLast = i === r.cards.length - 1;

                                                return (
                                                    <div
                                                        key={`${c.rank}-${c.suit}`}
                                                        className={`relative  ${isLast ? `shrink-0` : `shrink min-w-0`}`}
                                                        style={{ zIndex: i, width: `${isLast ? `${Math.round(scale * 80)}px` : `${Math.round(scale * 40)}px`}` }}
                                                    >
                                                        <Card
                                                            rank={c.rank}
                                                            suit={c.suit}
                                                            scale={scale}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>

                {/* Nút chơi tiếp chung cho cả làng */}
                <div className="shrink-0 p-4 bg-zinc-950 border-t border-zinc-800 flex justify-center">
                    <button
                        onClick={onReadyNext}
                        className="w-full sm:w-auto px-12 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-zinc-950 font-black text-sm tracking-widest rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                    >
                        CHƠI TIẾP
                    </button>
                </div>

            </div>
        </div>
    );
});

export default GameOverModal;
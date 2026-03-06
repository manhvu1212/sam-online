import React, { useState } from 'react';
import Card from './Card';
import GameLogic from '../utils/GameLogic';

export default function PlayerHand({ myCards, lastMove, roomStatus, selectedCards, setSelectedCards, isValidMove }) {
    if (!myCards || myCards.length === 0) {
        return <p className="text-zinc-600 text-xs font-bold tracking-widest mb-2">CHƯA CÓ BÀI</p>;
    }

    const [isToggle, setIsToggle] = useState(false);

    // --- THUẬT TOÁN CHỌN BÀI THÔNG MINH ---
    const toggleCardSelection = (clickedCard) => {
        if (roomStatus !== "PLAYING") return
        if (isToggle) return

        setIsToggle(true)

        // 1. Cụp lá bài xuống nếu đang được chọn
        const isSelected = selectedCards.some(c => c.rank === clickedCard.rank && c.suit === clickedCard.suit);
        if (isSelected) {
            setSelectedCards(prev => prev.filter(c => !(c.rank === clickedCard.rank && c.suit === clickedCard.suit)));
        } else {
            const lastCardsOnBoard = lastMove ? lastMove.cards : null;
            const lastCombo = GameLogic.getCombo(lastCardsOnBoard);

            if (lastCombo) {
                // TRƯỜNG HỢP A: Đối thủ đánh 1 LÁ LẺ (Gợi ý chặt Heo)
                if (lastCombo.type === 'SINGLE') {
                    if (lastCombo.highestRank === 15) {
                        const myQuads = myCards.filter(c => c.rank === clickedCard.rank);
                        if (myQuads.length === 4) return setSelectedCards(myQuads);
                    }
                    return setSelectedCards([clickedCard]);
                }

                // TRƯỜNG HỢP B: Đối thủ đánh ĐÔI, BA, TỨ QUÝ (Gợi ý nhấc cả bộ)
                if (['PAIR', 'TRIPLE', 'QUAD'].includes(lastCombo.type)) {
                    const requiredLength = lastCombo.length;
                    const sameRankCards = myCards.filter(c => c.rank === clickedCard.rank);

                    if (sameRankCards.length >= requiredLength) return setSelectedCards(sameRankCards.slice(0, requiredLength));
                    return setSelectedCards([clickedCard]);
                }

                // TRƯỜNG HỢP C: Đối thủ đánh SẢNH (Gợi ý tự động nhấc sảnh)
                if (lastCombo.type === 'STRAIGHT') {
                    const requiredLength = lastCombo.length;
                    const clickedRank = clickedCard.rank; // Lấy trực tiếp rank (số)

                    // Dò sảnh: Cộng dần rank lên để tìm các lá tiếp theo
                    let autoStraight = [];
                    for (let i = 0; i < requiredLength; i++) {
                        // sảng không có 2
                        const nextCard = myCards.find(c => c.rank != 15 && c.rank === clickedRank + i);
                        if (nextCard) {
                            autoStraight.push(nextCard);
                        } else {
                            break; // Đứt sảnh
                        }
                    }

                    if (autoStraight.length === requiredLength) return setSelectedCards(autoStraight);

                    if (selectedCards.length >= requiredLength) return setSelectedCards([clickedCard]);

                    return setSelectedCards(prev => [...prev, clickedCard]);
                }
            }

            // TRƯỜNG HỢP D: Mở vòng (Tự do nhặt bài)
            setSelectedCards(prev => [...prev, clickedCard]);
        }

        setIsToggle(false)
    };

    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 0.7 : 1.2

    return (


        <div className="flex justify-center w-full max-w-full">
            {[...myCards].sort((a, b) => a.rank - b.rank).map((c, i) => {
                // Kiểm tra xem đây có phải lá cuối cùng không
                const isLast = i === myCards.length - 1;
                const isSelected = selectedCards.some(card => c.rank === card.rank && c.suit === card.suit);

                return (
                    <div
                        key={`${c.rank}-${c.suit}`}
                        onClick={() => toggleCardSelection(c)}
                        className={`relative touch-manipulation select-none  ${isLast ? `shrink-0` : `shrink min-w-0`}`}
                        style={{ zIndex: i, width: `${isLast ? `${scale * 80}px` : `${scale * 60}px`}` }}
                    >
                        <Card
                            rank={c.rank}
                            suit={c.suit}
                            scale={scale}
                            className={`${isSelected ? '-translate-y-4 md:-translate-y-6' : 'translate-y-0'}`}
                        />
                    </div>
                );
            })}
        </div>
    );
}
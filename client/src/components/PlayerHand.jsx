import React from 'react';
import Card from './Card';

export default function PlayerHand({ myCards, selectedCards, toggleCardSelection, isValidMove }) {
    if (!myCards || myCards.length === 0) {
        return <p className="text-zinc-600 text-xs font-bold tracking-widest mb-2">CHƯA CÓ BÀI</p>;
    }

    return (
        <div className="flex justify-center -space-x-8 sm:-space-x-10">
            {myCards.map((card) => {
                const isSelected = selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);

                return (
                    <div
                        key={`${card.rank}_${card.suit}`}
                        onClick={() => toggleCardSelection(card)}
                        className={`
              cursor-pointer transition-transform duration-200 ease-out
              ${isSelected ? '-translate-y-6 z-40' : 'z-10 hover:-translate-y-2'}
            `}
                    >
                        <Card
                            rank={card.rank}
                            suit={card.suit}
                            className={`
                w-16 sm:w-20 transition-all duration-300
                ${isSelected
                                    ? (isValidMove
                                        ? 'border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                                        : 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)] opacity-90'
                                    )
                                    : 'border-zinc-500 shadow-[0_4px_10px_rgba(0,0,0,0.6)]'
                                }
              `}
                        />
                    </div>
                )
            })}
        </div>
    );
}
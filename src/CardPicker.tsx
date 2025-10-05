import React from "react";
import "./CardPicker.css";

type Card = { suit: string; value: number; label: string; id: string };

export default function CardPicker({
  onSelect,
  selected,
}: {
  onSelect: (card: Card) => void;
  selected: Card[];
}) {
  const suits = ["♠", "♥", "♣", "♦"];
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  const cards: Card[] = [];
  suits.forEach((suit) => {
    values.forEach((v) => {
      const label =
        v === 1
          ? "A"
          : v === 11
          ? "J"
          : v === 12
          ? "Q"
          : v === 13
          ? "K"
          : v.toString();
      cards.push({ suit, value: v, label, id: `${suit}${v}` });
    });
  });
  cards.push({ suit: "🃏", value: 0, label: "JOKER", id: "JOKER" });

  const isSelected = (id: string) => selected.some((c) => c.id === id);

  return (
    <div className="card-picker">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`pick-card ${isSelected(card.id) ? "selected" : ""}`}
          onClick={() => onSelect(card)}
        >
          <span className="card-label">{card.label}</span>
          <span className="card-suit">{card.suit}</span>
        </div>
      ))}
    </div>
  );
}

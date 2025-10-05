import React from "react";
import "./CardKeyDisplay.css";

type Card = { suit: string; value: number; label: string; id: string };

export default function CardKeyDisplay({
  selected,
  onClear,
}: {
  selected: Card[];
  onClear: () => void;
}) {
  return (
    <div className="card-key-display">
      <h4>Selected Key Sequence</h4>
      <div className="key-sequence">
        {selected.length === 0 ? (
          <span>No cards selected.</span>
        ) : (
          selected.map((c, i) => (
            <span key={i} className="key-card">
              {c.suit}
              {c.label}
            </span>
          ))
        )}
      </div>
      <button onClick={onClear}>Clear Key</button>
    </div>
  );
}

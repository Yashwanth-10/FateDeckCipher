import React from "react";
import "./DeckVisualizer.css";

export default function DeckVisualizer({ cards, highlight, xorInfo }: { cards: string[]; highlight?: number[]; xorInfo?: string | undefined }) {
  return (
    <div className="deck-visualizer">
      <div className="cards-row">
        {cards.map((c, i) => {
          const h = (highlight || []).includes(i);
          return (
            <div key={i} className={`card ${h ? "highlight" : ""}`}>
              <div className="card-face">{c}</div>
              <div className="card-index">{i}</div>
            </div>
          );
        })}
      </div>
      {xorInfo && <div className="xor-mini">{xorInfo.split("\n").slice(0,5).join("\n")}{xorInfo.split("\n").length>5?"\n...":""}</div>}
    </div>
  );
}

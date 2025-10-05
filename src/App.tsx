import React, { useState, useEffect, useRef } from "react";
import { buildTrace, StepRecord, parseKey } from "./cipherEngine";
import DeckVisualizer from "./DeckVisualizer";
import Controls from "./Controls";
import CardPicker from "./CardPicker";
import CardKeyDisplay from "./CardKeyDisplay";
import "./App.css";

type Card = { suit: string; value: number; label: string; id: string };

export default function App() {
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [plainText, setPlainText] = useState("BORDERLAND");
  const [cipherText, setCipherText] = useState("");
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  const [deck, setDeck] = useState<string[]>([]);
  const [trace, setTrace] = useState<StepRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Update deck based on mode
  useEffect(() => {
    if (mode === "encrypt") setDeck(plainText.split(""));
    else setDeck(cipherText.split(""));
  }, [plainText, cipherText, mode]);

  // Convert selected cards to key format
  const keyString = selectedCards
    .map((c) => (c.suit === "🃏" ? "JOKER" : `${c.suit}${c.value}`))
    .join(" ");
  const keyTokens = parseKey(keyString);

  // Build trace whenever deck or key changes
  useEffect(() => {
    const t = buildTrace(deck, keyTokens, mode === "encrypt");
    setTrace(t);
    setIndex(0);
  }, [deck, keyString, mode]);

  // Animation timer
  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        setIndex((i) => {
          if (i >= trace.length - 1) {
            window.clearInterval(timerRef.current ?? 0);
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 900);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, trace.length]);

  const current = trace[index] ?? null;
  const finalOutput = trace.length > 0 ? trace[trace.length - 1].deck.join("") : "";

  const handleCardSelect = (card: Card) => {
    setSelectedCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      if (exists) return prev.filter((c) => c.id !== card.id);
      else return [...prev, card];
    });
  };

  return (
    <div className="app">
      <header>
        <h1>Fate Deck Cipher — Interactive Visualizer</h1>
        <div className="mode-toggle">
          <label>
            Mode:
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "encrypt" | "decrypt");
                setIndex(0);
                setPlaying(false);
              }}
            >
              <option value="encrypt">Encryption</option>
              <option value="decrypt">Decryption</option>
            </select>
          </label>
        </div>
      </header>

      <main>
        <section className="inputs">
          {mode === "encrypt" ? (
            <div className="field">
              <label>Plaintext</label>
              <input
                value={plainText}
                onChange={(e) => setPlainText(e.target.value.toUpperCase())}
                placeholder="Enter text to encrypt"
              />
            </div>
          ) : (
            <div className="field">
              <label>Ciphertext</label>
              <input
                value={cipherText}
                onChange={(e) => setCipherText(e.target.value)}
                placeholder="Enter ciphertext to decrypt"
              />
            </div>
          )}

          <CardPicker onSelect={handleCardSelect} selected={selectedCards} />
          <CardKeyDisplay
            selected={selectedCards}
            onClear={() => setSelectedCards([])}
          />

          <div className="field">
            <button
              onClick={() => {
                setIndex(0);
                setPlaying(false);
              }}
            >
              Reset
            </button>
          </div>
        </section>

        <section className="visual">
          <DeckVisualizer
            cards={current?.deck ?? deck}
            highlight={current?.affectedIndexes ?? []}
            xorInfo={current?.xorInfo}
          />

          <div className="step-box">
            <h3>
              Step {index}/{Math.max(1, trace.length - 1)}
            </h3>
            <div className="step-desc">{current?.desc ?? "Initial deck"}</div>

            <Controls
              playing={playing}
              onPlayPause={() => setPlaying((p) => !p)}
              onPrev={() => {
                setIndex((i) => Math.max(0, i - 1));
                setPlaying(false);
              }}
              onNext={() => {
                setIndex((i) => Math.min(trace.length - 1, i + 1));
                setPlaying(false);
              }}
              onJump={(i) => {
                setIndex(Math.max(0, Math.min(trace.length - 1, i)));
                setPlaying(false);
              }}
              traceLength={trace.length}
              currentIndex={index}
            />

            {current?.xorInfo && (
              <div className="xor-panel">
                <h4>XOR details</h4>
                <pre>{current.xorInfo}</pre>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer>
        {mode === "encrypt" ? (
          <div>
            <b>Encrypted Output:</b> <code>{finalOutput}</code>
          </div>
        ) : (
          <div>
            <b>Decrypted Output:</b> <code>{finalOutput}</code>
          </div>
        )}
      </footer>
    </div>
  );
}

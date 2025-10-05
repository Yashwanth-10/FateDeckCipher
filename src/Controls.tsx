import React, { useState } from "react";
import "./Controls.css";

export default function Controls({ playing, onPlayPause, onPrev, onNext, onJump, traceLength, currentIndex }: { playing: boolean; onPlayPause: () => void; onPrev: () => void; onNext: () => void; onJump: (i:number)=>void; traceLength:number; currentIndex:number; }) {
  const [goto, setGoto] = useState<number>(currentIndex);
  return (
    <div className="controls">
      <button onClick={onPrev}>◀ Prev</button>
      <button onClick={onPlayPause}>{playing ? "⏸ Pause" : "▶ Play"}</button>
      <button onClick={onNext}>Next ▶</button>
      <div className="goto">
        <input type="number" min={0} max={Math.max(0, traceLength-1)} value={goto} onChange={(e)=>setGoto(Number(e.target.value))} />
        <button onClick={() => onJump(goto)}>Jump</button>
      </div>
      <div className="progress">Index: {currentIndex} / {Math.max(0, traceLength-1)}</div>
    </div>
  );
}

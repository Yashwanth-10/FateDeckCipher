export type Suit = "SPADE" | "HEART" | "CLUB" | "DIAMOND" | "JOKER";
export type KeyToken = { suit: Suit; value: number; raw?: string };

export type StepRecord = {
  deck: string[];
  desc: string;
  affectedIndexes?: number[];
  xorInfo?: string;
};

function normalizeFaceValue(v: number, len: number) {
  if (v === 1) return 1;
  if (v === 11) return Math.min(11, len);
  if (v === 12) return Math.min(12, len);
  if (v === 13) return len;
  return Math.min(v, len);
}

export function parseKey(raw: string): KeyToken[] {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const map: Record<string, Suit> = { "♠": "SPADE", "S": "SPADE", "♣": "CLUB", "C": "CLUB", "♥": "HEART", "H": "HEART", "♦": "DIAMOND", "D": "DIAMOND", "JOKER": "JOKER", "JOOKER": "JOKER" };
  return tokens.map((t, i) => {
    const r = t.trim();
    if (r.toUpperCase().startsWith("JOKER") || r === "🃏" || r.toUpperCase()==="JO") return { suit: "JOKER", value: i + 1, raw: r };
    const suitChar = r[0];
    const suit = map[suitChar.toUpperCase()] ?? map[suitChar] ?? "SPADE";
    const val = parseInt(r.slice(1)) || 0;
    return { suit, value: val || 0, raw: r };
  });
}

function cut(deck: string[], n: number) {
  const top = deck.slice(0, n);
  const rest = deck.slice(n);
  return rest.concat(top);
}

function reverseTop(deck: string[], n: number) {
  const top = deck.slice(0, n).reverse();
  return top.concat(deck.slice(n));
}

function faro(deck: string[], times: number) {
  let d = deck.slice();
  for (let t = 0; t < times; t++) {
    const half = Math.floor(d.length / 2);
    const left = d.slice(0, half);
    const right = d.slice(half);
    const out: string[] = [];
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i++) {
      if (i < left.length) out.push(left[i]);
      if (i < right.length) out.push(right[i]);
    }
    d = out;
  }
  return d;
}

function rotateLeft(deck: string[], n: number) {
  n = n % deck.length;
  return deck.slice(n).concat(deck.slice(0, n));
}

function rotateRight(deck: string[], n: number) {
  n = n % deck.length;
  return deck.slice(deck.length - n).concat(deck.slice(0, deck.length - n));
}

function xorWithN(deck: string[], n: number) {
  const out: string[] = [];
  const details: string[] = [];
  for (let i = 0; i < deck.length; i++) {
    const ch = deck[i];
    const code = ch.charCodeAt(0);
    const x = code ^ n;
    out.push(String.fromCharCode(x));
    details.push(`${ch} (${code}) ⊕ ${n} = ${x} → '${String.fromCharCode(x)}'`);
  }
  return { deck: out, details: details.join("\n") };
}

export function applyStep(deckIn: string[], token: KeyToken, posInKey: number): StepRecord {
  const len = deckIn.length;
  if (token.suit === "JOKER") {
    const mirrored = deckIn.slice().reverse();
    const asciiSum = mirrored.reduce((s, c) => s + c.charCodeAt(0), 0);
    const N = asciiSum % len;
    const suitOrder: Suit[] = ["SPADE", "HEART", "CLUB", "DIAMOND"];
    const chosenSuit = suitOrder[(posInKey - 1) % suitOrder.length];
    const inner = applyStep(mirrored, { suit: chosenSuit, value: N }, posInKey);
    const xorSeed = (mirrored[0].charCodeAt(0) + mirrored[mirrored.length - 1].charCodeAt(0)) % 7;
    const xored = xorWithN(inner.deck, xorSeed);
    return { deck: xored.deck, desc: `JOKER: mirrored → applied ${chosenSuit} with N=${N} then XOR seed ${xorSeed}`, affectedIndexes: Array.from({ length: len }, (_, i) => i), xorInfo: xored.details + `\nJoker XOR seed applied: ${xorSeed}` };
  }

  if (token.suit === "SPADE") {
    const val = normalizeFaceValue(token.value, len);
    const res = cut(deckIn, val);
    return { deck: res, desc: `♠${token.value} CUT ${val}`, affectedIndexes: Array.from({ length: len }, (_, i) => i) };
  }
  if (token.suit === "HEART") {
    const val = normalizeFaceValue(token.value, len);
    const res = reverseTop(deckIn, val);
    return { deck: res, desc: `♥${token.value} REVERSE top ${val}`, affectedIndexes: Array.from({ length: val }, (_, i) => i) };
  }
  if (token.suit === "CLUB") {
    const val = normalizeFaceValue(token.value, len);
    const res = faro(deckIn, val);
    return { deck: res, desc: `♣${token.value} FARO x${val}`, affectedIndexes: Array.from({ length: len }, (_, i) => i) };
  }
  if (token.suit === "DIAMOND") {
    const val = normalizeFaceValue(token.value, len);
    const rotated = rotateLeft(deckIn, val);
    const xored = xorWithN(rotated, val);
    return { deck: xored.deck, desc: `♦${token.value} ROTATE ${val} + XOR ${val}`, affectedIndexes: Array.from({ length: len }, (_, i) => i), xorInfo: xored.details };
  }
  return { deck: deckIn.slice(), desc: `NOOP` };
}

export function invertStep(record: StepRecord, token: KeyToken, posInKey: number): StepRecord {
  if (token.suit === "JOKER") {
    const len = record.deck.length;
    const mirrored = record.deck.slice().reverse();
    const asciiSum = mirrored.reduce((s, c) => s + c.charCodeAt(0), 0);
    const N = asciiSum % len;
    const suitOrder: Suit[] = ["SPADE", "HEART", "CLUB", "DIAMOND"];
    const chosenSuit = suitOrder[(posInKey - 1) % suitOrder.length];
    const xorSeed = (mirrored[0].charCodeAt(0) + mirrored[mirrored.length - 1].charCodeAt(0)) % 7;
    const unxor = xorWithN(record.deck, xorSeed);
    const innerInv = invertStep({ deck: unxor.deck, desc: "" }, { suit: chosenSuit, value: N }, posInKey);
    const unmirrored = innerInv.deck.slice().reverse();
    return { deck: unmirrored, desc: `JOKER inverse` , xorInfo: unxor.details };
  }
  if (token.suit === "SPADE") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const res = rotateRight(record.deck, val);
    return { deck: res, desc: `undo ♠${token.value} CUT (rotate right ${val})` };
  }
  if (token.suit === "HEART") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const res = reverseTop(record.deck, val);
    return { deck: res, desc: `undo ♥${token.value} REVERSE top ${val}` };
  }
  if (token.suit === "CLUB") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    let d = record.deck.slice();
    for (let t = 0; t < val; t++) {
      const left: string[] = [];
      const right: string[] = [];
      for (let i = 0; i < d.length; i++) {
        if (i % 2 === 0) left.push(d[i]);
        else right.push(d[i]);
      }
      d = left.concat(right);
    }
    return { deck: d, desc: `undo ♣${token.value} FARO x${val}` };
  }
  if (token.suit === "DIAMOND") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const unxor = xorWithN(record.deck, val);
    const unrot = rotateRight(unxor.deck, val);
    return { deck: unrot, desc: `undo ♦${token.value} ROTATE+XOR (right ${val} then XOR ${val})`, xorInfo: unxor.details };
  }
  return { deck: record.deck.slice(), desc: "noop" };
}

export function buildTrace(initialDeck: string[], key: KeyToken[], encrypt = true): StepRecord[] {
  const trace: StepRecord[] = [];
  trace.push({ deck: initialDeck.slice(), desc: "Initial" });
  if (encrypt) {
    let cur = initialDeck.slice();
    for (let i = 0; i < key.length; i++) {
      const token = key[i];
      const rec = applyStep(cur, token, i + 1);
      trace.push(rec);
      cur = rec.deck.slice();
    }
  } else {
    let cur = initialDeck.slice();
    for (let i = key.length - 1; i >= 0; i--) {
      const token = key[i];
      const rec = invertStep({ deck: cur, desc: "" }, token, i + 1);

      trace.push(rec);
      cur = rec.deck.slice();
    }
  }
  return trace;
}

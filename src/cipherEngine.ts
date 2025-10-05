export type Suit = "SPADE" | "HEART" | "CLUB" | "DIAMOND" | "JOKER";
export type KeyToken = { suit: Suit; value: number; raw?: string };

export type StepRecord = {
  deck: string[];
  desc: string;
  affectedIndexes?: number[];
  xorInfo?: string;
};

/* -------------------------------------------------------------------------- */
/*                             Value Normalization                            */
/* -------------------------------------------------------------------------- */

function normalizeFaceValue(v: number, len: number) {
  if (v === 1) return 1;                     // Ace
  if (v === 11) return Math.min(11, len);    // Jack
  if (v === 12) return Math.min(12, len);    // Queen (mirror logic separate)
  if (v === 13) return len;                  // King = full deck
  return Math.min(v, len);
}

/* -------------------------------------------------------------------------- */
/*                             Key String Parser                              */
/* -------------------------------------------------------------------------- */

export function parseKey(raw: string): KeyToken[] {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const map: Record<string, Suit> = {
    "♠": "SPADE", "S": "SPADE",
    "♣": "CLUB",  "C": "CLUB",
    "♥": "HEART", "H": "HEART",
    "♦": "DIAMOND", "D": "DIAMOND",
    "JOKER": "JOKER", "🃏": "JOKER"
  };

  return tokens.map((t, i) => {
    const r = t.trim();
    if (r.toUpperCase().startsWith("JOKER") || r === "🃏") {
      return { suit: "JOKER", value: i + 1, raw: r };
    }
    const suitChar = r[0];
    const suit = map[suitChar.toUpperCase()] ?? map[suitChar] ?? "SPADE";
    const val = parseInt(r.slice(1)) || 0;
    return { suit, value: val || 0, raw: r };
  });
}

/* -------------------------------------------------------------------------- */
/*                                Operations                                  */
/* -------------------------------------------------------------------------- */

function cut(deck: string[], n: number) {
  const top = deck.slice(0, n);
  const rest = deck.slice(n);
  return rest.concat(top);
}

function reverseTop(deck: string[], n: number) {
  const top = deck.slice(0, n).reverse();
  return top.concat(deck.slice(n));
}

/* ---------------------------- FARO (Offset-based) ---------------------------- */

function faro(deck: string[], n: number) {
  const len = deck.length;
  if (len < 2) return deck.slice();

  // Always split deck in half
  const half = Math.floor(len / 2);
  const left = deck.slice(0, half);
  const right = deck.slice(half);

  const result: string[] = [];

  // Add the first n cards from left half directly
  for (let i = 0; i < n && i < left.length; i++) {
    result.push(left[i]);
  }

  // Now interleave remaining from left and right
  let i = n;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (j < right.length) result.push(right[j++]);
    if (i < left.length) result.push(left[i++]);
  }

  return result;
}


/* Reverse of FARO */
function unfaro(deck: string[], n: number) {
  const len = deck.length;
  if (len < 2) return deck.slice();

  const half = Math.floor(len / 2);
  const left: string[] = [];
  const right: string[] = [];

  // Step 1: First n cards definitely belong to left
  let idx = 0;
  for (; idx < n && idx < deck.length; idx++) {
    left.push(deck[idx]);
  }

  // Step 2: Remaining cards come in interleaved pattern (R,L,R,L,...)
  let toggle = true; // start with right (since faro added right first)
  while (idx < deck.length) {
    if (toggle) right.push(deck[idx]);
    else left.push(deck[idx]);
    toggle = !toggle;
    idx++;
  }

  // Step 3: Recombine to original left + right halves
  return left.concat(right);
}

/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                         Face Card Mirror Handling                          */
/* -------------------------------------------------------------------------- */

function isQueen(value: number) {
  return value === 12;
}

function maybeMirror(deck: string[], value: number, action: (d: string[]) => string[]): string[] {
  if (isQueen(value)) {
    const mirrored = deck.slice().reverse();
    const result = action(mirrored).reverse();
    return result;
  } else {
    return action(deck);
  }
}

/* -------------------------------------------------------------------------- */
/*                                Apply Step                                  */
/* -------------------------------------------------------------------------- */

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
    return {
      deck: xored.deck,
      desc: `JOKER: mirrored → applied ${chosenSuit} with N=${N} then XOR seed ${xorSeed}`,
      affectedIndexes: Array.from({ length: len }, (_, i) => i),
      xorInfo: xored.details + `\nJoker XOR seed applied: ${xorSeed}`
    };
  }

  if (token.suit === "SPADE") {
    const val = normalizeFaceValue(token.value, len);
    const res = maybeMirror(deckIn, token.value, (d) => cut(d, val));
    return {
      deck: res,
      desc: `♠${token.value} CUT ${val}${isQueen(token.value) ? " (mirrored)" : ""}`,
      affectedIndexes: Array.from({ length: len }, (_, i) => i)
    };
  }

  if (token.suit === "HEART") {
    const val = normalizeFaceValue(token.value, len);
    const res = maybeMirror(deckIn, token.value, (d) => reverseTop(d, val));
    return {
      deck: res,
      desc: `♥${token.value} REVERSE top ${val}${isQueen(token.value) ? " (mirrored)" : ""}`,
      affectedIndexes: Array.from({ length: val }, (_, i) => i)
    };
  }

  if (token.suit === "CLUB") {
    const val = normalizeFaceValue(token.value, len);
    const res = maybeMirror(deckIn, token.value, (d) => faro(d, val));
    return {
      deck: res,
      desc: `♣${token.value} FARO split at ${val}${isQueen(token.value) ? " (mirrored)" : ""}`,
      affectedIndexes: Array.from({ length: len }, (_, i) => i)
    };
  }

  if (token.suit === "DIAMOND") {
    const val = normalizeFaceValue(token.value, len);
    const res = maybeMirror(deckIn, token.value, (d) => {
      const rotated = rotateLeft(d, val);
      const xored = xorWithN(rotated, val);
      return xored.deck;
    });
    return {
      deck: res,
      desc: `♦${token.value} ROTATE ${val} + XOR ${val}${isQueen(token.value) ? " (mirrored)" : ""}`,
      affectedIndexes: Array.from({ length: len }, (_, i) => i)
    };
  }

  return { deck: deckIn.slice(), desc: "NOOP" };
}

/* -------------------------------------------------------------------------- */
/*                               Invert Step                                  */
/* -------------------------------------------------------------------------- */

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
    return { deck: unmirrored, desc: `JOKER inverse`, xorInfo: unxor.details };
  }

  if (token.suit === "SPADE") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const res = maybeMirror(record.deck, token.value, (d) => rotateRight(d, val));
    return { deck: res, desc: `undo ♠${token.value} CUT${isQueen(token.value) ? " (mirrored)" : ""}` };
  }

  if (token.suit === "HEART") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const res = maybeMirror(record.deck, token.value, (d) => reverseTop(d, val));
    return { deck: res, desc: `undo ♥${token.value} REVERSE${isQueen(token.value) ? " (mirrored)" : ""}` };
  }

  if (token.suit === "CLUB") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const res = maybeMirror(record.deck, token.value, (d) => unfaro(d, val));
    return { deck: res, desc: `undo ♣${token.value} FARO${isQueen(token.value) ? " (mirrored)" : ""}` };
  }

  if (token.suit === "DIAMOND") {
    const val = normalizeFaceValue(token.value, record.deck.length);
    const res = maybeMirror(record.deck, token.value, (d) => {
      const unxor = xorWithN(d, val);
      const unrot = rotateRight(unxor.deck, val);
      return unrot;
    });
    return { deck: res, desc: `undo ♦${token.value} ROTATE+XOR${isQueen(token.value) ? " (mirrored)" : ""}` };
  }

  return { deck: record.deck.slice(), desc: "noop" };
}

/* -------------------------------------------------------------------------- */
/*                               Trace Builder                                */
/* -------------------------------------------------------------------------- */

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

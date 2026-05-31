// Client-side card store — everything lives in the browser's localStorage.
// No database, no network, no accounts. This is what makes the app impossible
// to "break on deploy": there's nothing external to provision or connect.
//
// The only server calls the app makes are to Claude (for AI definitions and
// dictation parsing), and those are optional — the app works fully offline
// without them.

import { schedule, delay as delaySchedule, type Grade } from "./scheduler";

export type CardState = "new" | "learning" | "review";

export interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  state: CardState;
  due: string; // ISO
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  total: number;
  due: number;
  new: number;
  learning: number;
  review: number;
  reviewedToday: number;
}

const CARDS_KEY = "memory.cards.v1";
const REVIEWLOG_KEY = "memory.reviewlog.v1"; // ISO timestamps of grades

// ---- low-level persistence ----

function readCards(): Card[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CARDS_KEY);
    return raw ? (JSON.parse(raw) as Card[]) : [];
  } catch {
    return [];
  }
}

function writeCards(cards: Card[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

function readReviewLog(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEWLOG_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function logReview(): void {
  if (typeof window === "undefined") return;
  const log = readReviewLog();
  log.push(new Date().toISOString());
  // keep the log from growing forever — last 1000 reviews is plenty for "today"
  window.localStorage.setItem(
    REVIEWLOG_KEY,
    JSON.stringify(log.slice(-1000))
  );
}

function uid(): string {
  // Prefer the platform UUID; fall back for older browsers.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- public API (all synchronous, all local) ----

export function getCards(): Card[] {
  return readCards().sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export interface NewCardInput {
  front: string;
  back: string;
  tags?: string[];
}

export function addCard(input: NewCardInput): Card {
  const now = new Date().toISOString();
  const card: Card = {
    id: uid(),
    front: input.front.trim(),
    back: input.back.trim(),
    tags: (input.tags || []).map((t) => t.trim()).filter(Boolean),
    state: "new",
    due: now, // new cards are due immediately
    intervalDays: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  };
  const cards = readCards();
  cards.push(card);
  writeCards(cards);
  return card;
}

export function addCards(inputs: NewCardInput[]): Card[] {
  return inputs.map((i) => addCard(i));
}

export function deleteCard(id: string): void {
  writeCards(readCards().filter((c) => c.id !== id));
}

// The review queue: everything due now, learning cards first, then new, then
// review — and within each, soonest-due first.
export function getQueue(now = new Date()): Card[] {
  const order: Record<CardState, number> = { learning: 0, new: 1, review: 2 };
  return readCards()
    .filter((c) => new Date(c.due) <= now)
    .sort((a, b) => {
      const s = order[a.state] - order[b.state];
      if (s !== 0) return s;
      return +new Date(a.due) - +new Date(b.due);
    });
}

export function gradeCard(id: string, grade: Grade, now = new Date()): void {
  const cards = readCards();
  const i = cards.findIndex((c) => c.id === id);
  if (i === -1) return;
  const c = cards[i];
  const next = schedule(
    {
      state: c.state,
      due: new Date(c.due),
      intervalDays: c.intervalDays,
      ease: c.ease,
      reps: c.reps,
      lapses: c.lapses,
    },
    { grade, now }
  );
  cards[i] = {
    ...c,
    state: next.state,
    due: next.due.toISOString(),
    intervalDays: next.intervalDays,
    ease: next.ease,
    reps: next.reps,
    lapses: next.lapses,
    updatedAt: now.toISOString(),
  };
  writeCards(cards);
  logReview();
}

export function delayCard(id: string, ms: number, now = new Date()): void {
  const cards = readCards();
  const i = cards.findIndex((c) => c.id === id);
  if (i === -1) return;
  const c = cards[i];
  const next = delaySchedule(
    {
      state: c.state,
      due: new Date(c.due),
      intervalDays: c.intervalDays,
      ease: c.ease,
      reps: c.reps,
      lapses: c.lapses,
    },
    ms,
    now
  );
  cards[i] = { ...c, due: next.due.toISOString(), updatedAt: now.toISOString() };
  writeCards(cards);
  logReview();
}

export function getStats(now = new Date()): ReviewStats {
  const cards = readCards();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const reviewedToday = readReviewLog().filter(
    (ts) => new Date(ts) >= startOfDay
  ).length;
  return {
    total: cards.length,
    due: cards.filter((c) => new Date(c.due) <= now).length,
    new: cards.filter((c) => c.state === "new").length,
    learning: cards.filter((c) => c.state === "learning").length,
    review: cards.filter((c) => c.state === "review").length,
    reviewedToday,
  };
}

// ---- export / import (so data isn't trapped — a safety valve) ----

export function exportJSON(): string {
  return JSON.stringify({ cards: readCards(), reviewLog: readReviewLog() }, null, 2);
}

export function importJSON(json: string): number {
  const data = JSON.parse(json);
  if (!Array.isArray(data.cards)) throw new Error("Invalid backup file.");
  writeCards(data.cards);
  if (Array.isArray(data.reviewLog)) {
    window.localStorage.setItem(REVIEWLOG_KEY, JSON.stringify(data.reviewLog));
  }
  return data.cards.length;
}

// Spaced-repetition scheduling engine.
//
// This is an SM-2-inspired scheduler that works in *minutes* so that short
// learning steps (like "5 minutes") and long intervals (like "2 weeks") live
// in the same unit. Every review maps a grade to a new interval, ease factor,
// and due date.
//
// We expose two ways to schedule a card:
//   1. grade(card, "again"|"hard"|"good"|"easy")  -> adaptive SM-2 spacing
//   2. delay(card, minutes)                        -> fixed interval (the
//      "just push it 5 min / 1 day / 2 weeks" buttons you asked for)

export const MIN = 1;
export const HOUR = 60;
export const DAY = 60 * 24; // 1440 minutes
export const WEEK = DAY * 7;

export type Grade = "again" | "hard" | "good" | "easy";
export type CardState = "new" | "learning" | "review";

export interface SchedulableCard {
  state: CardState;
  intervalMin: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface ScheduleResult {
  state: CardState;
  intervalMin: number;
  ease: number;
  reps: number;
  lapses: number;
  due: Date;
}

// Learning steps (minutes) for new / lapsed cards before they "graduate".
const LEARNING_AGAIN = 5 * MIN; // the 5-minute delay you specifically wanted
const LEARNING_HARD = 10 * MIN;
const GRADUATING_INTERVAL = 1 * DAY; // "Good" graduates to 1 day
const EASY_INTERVAL = 4 * DAY; // "Easy" graduates straight to 4 days

const MIN_EASE = 1.3;
const HARD_MULTIPLIER = 1.2;
const EASY_BONUS = 1.3;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Apply an adaptive grade to a card and return its new scheduling state.
 */
export function grade(card: SchedulableCard, g: Grade, now = new Date()): ScheduleResult {
  let { state, intervalMin, ease, reps, lapses } = card;

  if (state === "new" || state === "learning") {
    // --- Learning phase ---
    switch (g) {
      case "again":
        intervalMin = LEARNING_AGAIN;
        state = "learning";
        break;
      case "hard":
        intervalMin = LEARNING_HARD;
        state = "learning";
        break;
      case "good":
        intervalMin = GRADUATING_INTERVAL;
        state = "review";
        reps += 1;
        break;
      case "easy":
        intervalMin = EASY_INTERVAL;
        state = "review";
        reps += 1;
        break;
    }
  } else {
    // --- Review phase (SM-2) ---
    switch (g) {
      case "again":
        lapses += 1;
        ease = Math.max(MIN_EASE, ease - 0.2);
        intervalMin = LEARNING_AGAIN;
        state = "learning"; // relearn
        break;
      case "hard":
        ease = Math.max(MIN_EASE, ease - 0.15);
        intervalMin = Math.round(intervalMin * HARD_MULTIPLIER);
        reps += 1;
        break;
      case "good":
        intervalMin = Math.round(intervalMin * ease);
        reps += 1;
        break;
      case "easy":
        ease = ease + 0.15;
        intervalMin = Math.round(intervalMin * ease * EASY_BONUS);
        reps += 1;
        break;
    }
  }

  // Don't let review intervals collapse below a day once graduated.
  if (state === "review" && intervalMin < DAY) intervalMin = DAY;

  return { state, intervalMin, ease, reps, lapses, due: addMinutes(now, intervalMin) };
}

/**
 * Push a card out by a fixed number of minutes (manual delay buttons).
 * Keeps ease/reps intact; useful for "remind me in 5 min / 1 day / 2 weeks".
 */
export function delay(card: SchedulableCard, minutes: number, now = new Date()): ScheduleResult {
  const state: CardState = minutes >= DAY ? "review" : card.state === "new" ? "learning" : card.state;
  return {
    state,
    intervalMin: minutes,
    ease: card.ease,
    reps: card.reps,
    lapses: card.lapses,
    due: addMinutes(now, minutes),
  };
}

/**
 * Preview what each grade button WOULD do, so the UI can label buttons with
 * the resulting interval (just like Anki shows "10m / 1d / 4d" above buttons).
 */
export function previewGrades(card: SchedulableCard, now = new Date()) {
  const grades: Grade[] = ["again", "hard", "good", "easy"];
  return grades.map((g) => ({
    grade: g,
    intervalMin: grade(card, g, now).intervalMin,
  }));
}

/** Fixed delay presets you can offer as quick buttons. */
export const DELAY_PRESETS: { label: string; minutes: number }[] = [
  { label: "5 min", minutes: 5 * MIN },
  { label: "1 day", minutes: 1 * DAY },
  { label: "2 days", minutes: 2 * DAY },
  { label: "3 days", minutes: 3 * DAY },
  { label: "2 weeks", minutes: 2 * WEEK },
];

/** Human-readable interval, e.g. 5 -> "5m", 1440 -> "1d", 20160 -> "2w". */
export function formatInterval(minutes: number): string {
  if (minutes < HOUR) return `${Math.round(minutes)}m`;
  if (minutes < DAY) return `${Math.round(minutes / HOUR)}h`;
  if (minutes < WEEK) return `${Math.round(minutes / DAY)}d`;
  if (minutes < DAY * 30) return `${Math.round(minutes / WEEK)}w`;
  if (minutes < DAY * 365) return `${Math.round(minutes / (DAY * 30))}mo`;
  return `${(minutes / (DAY * 365)).toFixed(1)}y`;
}

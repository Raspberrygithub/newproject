import Anthropic from "@anthropic-ai/sdk";

// Lazily construct the client so the app still boots (for non-AI features)
// even if no API key is configured yet.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

// Opus 4.8 uses *adaptive* thinking: the model decides how much to think, and
// you steer overall depth/spend with an effort level rather than a fixed token
// budget. (The old { type: "enabled", budget_tokens } form returns a 400 on
// Opus 4.7/4.8 — that's what "thinking.type.enabled is not supported" meant.)
//
// Override depth with ANTHROPIC_EFFORT (low | medium | high | xhigh | max),
// or turn thinking off entirely with ANTHROPIC_THINKING=off. ANTHROPIC_THINKING_TOKENS=0
// is still honoured as a way to disable thinking, for backwards compatibility.
//
// We default to "medium": writing a flashcard answer or splitting dictation
// doesn't need deep reasoning, and lower effort means the model spends fewer
// tokens thinking — so the (capped) max_tokens is far more likely to leave room
// for the actual answer instead of being eaten by thinking.
const THINKING_OFF =
  process.env.ANTHROPIC_THINKING === "off" ||
  process.env.ANTHROPIC_THINKING_TOKENS === "0";
const EFFORT = process.env.ANTHROPIC_EFFORT || "medium";

const thinking = THINKING_OFF
  ? ({ type: "disabled" } as const)
  : ({ type: "adaptive" } as const);
const outputConfig = THINKING_OFF ? undefined : { effort: EFFORT };

// The installed SDK (0.39) predates Opus 4.8, so `thinking: {type: "adaptive"}`
// and `output_config` aren't in its types yet — the REST API accepts them, so
// we build the request loosely and let the SDK serialize it.
async function createMessage(params: {
  max_tokens: number;
  system: string;
  user: string;
}): Promise<Anthropic.Message> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: params.max_tokens,
    thinking,
    ...(outputConfig ? { output_config: outputConfig } : {}),
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getClient().messages.create(body as any) as Promise<Anthropic.Message>;
}

export interface DraftCard {
  front: string;
  back: string;
  tags?: string[];
}

/**
 * Ask Claude to write the "back" (answer/definition) for a card given its
 * "front" (the term/question/topic). You supply the prompt, Claude fills it in.
 */
export async function generateDefinition(
  front: string,
  instructions?: string
): Promise<string> {
  const sys =
    "You write concise, accurate flashcard answers for spaced-repetition study. " +
    "Given the front of a card (a term, question, or topic), produce the back: " +
    "a clear, correct, study-friendly answer. Be precise and brief — a couple of " +
    "sentences or a tight definition, not an essay. Use plain text (no markdown " +
    "headers). Include a short example only if it genuinely aids memory.";

  const user =
    `Front of card:\n"""${front}"""\n\n` +
    (instructions ? `Extra instructions from the user:\n"""${instructions}"""\n\n` : "") +
    "Write only the back of the card. No preamble, no quotes around it.";

  // max_tokens covers thinking + the answer on Opus 4.8, so give generous
  // headroom — a too-low cap gets eaten by thinking and returns no text.
  const msg = await createMessage({ max_tokens: 8000, system: sys, user });

  return textOf(msg).trim();
}

/**
 * Parse free-form dictation (e.g. transcribed voice) into one or more cards.
 * The user might say several cards in a row; Claude splits and structures them.
 * If the user only gives a prompt/term and asks for a definition, Claude fills
 * the back itself.
 */
export async function parseDictationToCards(transcript: string): Promise<DraftCard[]> {
  const sys =
    "You convert a person's spoken study notes into flashcards for spaced " +
    "repetition. The speaker may dictate several cards at once, separated by " +
    "phrases like 'next card', 'front ... back ...', or just natural pauses. " +
    "If they give a term/question but no answer, OR explicitly ask you to look " +
    "it up or write the definition, you write an accurate, concise back " +
    "yourself. Keep fronts short (a term or question). Keep backs tight and " +
    "correct. Infer reasonable tags when obvious.\n\n" +
    "Respond with ONLY a JSON array, no prose, of objects: " +
    '[{"front": string, "back": string, "tags": string[]}]. ' +
    "If you cannot extract any card, return [].";

  const msg = await createMessage({
    max_tokens: 16000,
    system: sys,
    user: `Dictation transcript:\n"""${transcript}"""\n\nReturn the JSON array of cards.`,
  });

  const raw = textOf(msg).trim();
  return parseJsonCards(raw);
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function parseJsonCards(raw: string): DraftCard[] {
  // Strip code fences if the model wrapped the JSON.
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.front === "string" && typeof c.back === "string")
      .map((c) => ({
        front: String(c.front).trim(),
        back: String(c.back).trim(),
        tags: Array.isArray(c.tags) ? c.tags.map((t: unknown) => String(t)) : [],
      }))
      .filter((c) => c.front.length > 0);
  } catch {
    return [];
  }
}

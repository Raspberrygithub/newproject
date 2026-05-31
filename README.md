# Memory — Spaced Repetition + Claude + Voice

A cross-platform **PWA** for active recall and spaced repetition (an Anki-style
memory app), built to be **dead simple on your phone** and powered by **Claude**.

Open it in a browser, tap *Add to Home Screen*, and it works like a native app —
no App Store, no opening your Mac.

**No database. No accounts. No setup.** Your cards are saved right in your
browser, so there is nothing to provision and nothing that can fail on deploy.

---

## 🚀 Deploy it (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fraspberrygithub%2Fnewproject&project-name=memory&repository-name=memory)

**What happens when you click:**

1. Sign in with GitHub (one tap).
2. Click **Deploy**. ~2 minutes later you get your URL, e.g.
   `https://memory-xxxx.vercel.app`.
3. Open that URL on your phone → **Add to Home Screen**. Done. ✅

That's it. You can start making cards immediately.

### Want the AI features? (optional)

Two features use Claude — **✨ Ask Claude for the answer** and turning a
voice/text brain-dump into cards. To switch them on, add your Anthropic API key:

- In Vercel: **Project → Settings → Environment Variables → Add**
  `ANTHROPIC_API_KEY` (get one at
  <https://console.anthropic.com/settings/keys>), then **Redeploy**.

Everything else — writing cards by hand, reviewing, scheduling — works without a
key.

---

## Features

- **🎯 Spaced repetition** — SM-2-inspired scheduler (works in minutes). Grade
  buttons (Again / Hard / Good / Easy), plus quick fixed **delay presets**:
  5 min, 1 day, 2 days, 3 days, 2 weeks.
- **🎙️ Voice add** — talk through a bunch of cards in one go and Claude splits
  the dictation into structured front/back cards. *(needs an API key)*
- **✨ AI definitions** — on any card, hit *Ask Claude* and it writes the back.
  *(needs an API key)*
- **📚 Browse / search / edit** — manage the whole deck.
- **💾 Local-first** — cards live in your browser's `localStorage`. **Export**
  and **Import** buttons (on the Browse tab) let you back up or move your deck
  between devices.
- **📱 Installable PWA** — manifest, mobile-first dark UI, *Add to Home Screen*.

No login/passcode — the app opens straight in.

## Where's my data?

On your device, in the browser you used. That's the trade for zero setup:

- It is **not** synced across devices automatically. Use **Export backup** on
  one device and **Import backup** on another to move cards.
- Clearing your browser's site data will erase your cards — export first if you
  care about them.

## AI model

When a key is set, the AI features default to **Claude Opus 4.8** with adaptive
thinking at **high** effort. Override with the `ANTHROPIC_MODEL` and
`ANTHROPIC_EFFORT` (`low`/`medium`/`high`/`xhigh`/`max`) env vars, or set
`ANTHROPIC_THINKING="off"`, for cheaper/faster responses.

## Tech

Next.js 14 (App Router) · TypeScript · React · Anthropic SDK. No database, no ORM.

## Local development

```bash
npm install
cp .env.example .env     # optional: add ANTHROPIC_API_KEY for the AI features
npm run dev              # http://localhost:3000
```

## How scheduling works

`src/lib/scheduler.ts` is the engine (pure functions, no I/O). Cards move through
`new → learning → review`. Grading adjusts the ease factor and interval (SM-2);
"Again" drops a review card back into a short relearning step. `delay()` pushes a
card out by an exact amount for the preset buttons. `src/lib/store.ts` wires the
scheduler to browser storage.

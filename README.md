# Memory — Spaced Repetition + Claude + Voice

A cross-platform **PWA** for active recall and spaced repetition (an Anki-style
memory app), built to be **dead simple on your phone** and powered by **Claude**.

Open it in a browser, tap *Add to Home Screen*, and it works like a native app —
no App Store, no opening your Mac.

## Features

- **🎯 Spaced repetition** — SM-2-inspired scheduler (works in minutes). Grade
  buttons (Again / Hard / Good / Easy) are labelled with the resulting interval,
  plus quick fixed **delay presets**: 5 min, 1 day, 2 days, 3 days, 2 weeks.
- **🎙️ Voice add** — talk through a bunch of cards in one go (use your keyboard's
  dictation, or the on-screen mic where supported) and Claude splits the
  dictation into structured front/back cards. Say only a term + "look it up" and
  Claude writes the answer.
- **✨ AI definitions** — on any card, hit *Ask Claude* and it writes the back.
  Add instructions for tone, depth, or language.
- **📚 Browse / search / edit** — manage the whole deck.
- **🔌 Plain JSON API** — `/api/cards`, `/api/review`, `/api/ai/define`,
  `/api/ai/parse` for scripting and automation.
- **📱 Installable PWA** — manifest, service worker, offline app shell,
  mobile-first dark UI.
- **🔒 Single-user passcode** — set `APP_PASSCODE` to lock the public web.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · SQLite (dev) /
Postgres (prod) · Anthropic SDK.

## Quick start (local)

```bash
cp .env.example .env     # add your ANTHROPIC_API_KEY
npx prisma db push       # create local SQLite db
npm run db:seed          # optional sample cards
npm run dev              # http://localhost:3000
```

## Put it on your phone

See **[DEPLOY.md](./DEPLOY.md)** — one 1-line edit + pasting 4 env values into
Vercel (free), then *Add to Home Screen*. No command line.

## How scheduling works

`src/lib/scheduler.ts` is the engine. Cards move through `new → learning →
review`. Grading adjusts the ease factor and interval (SM-2); "Again" drops a
review card back into a 5-minute relearning step. `delay()` pushes a card out by
an exact amount for the preset buttons. Every answer is logged to the `Review`
table for stats.

## Project layout

```
src/
  app/
    page.tsx            # dashboard
    review/             # study session (grade + delay buttons)
    voice/              # dictation -> Claude -> draft cards
    add/                # manual add + "Ask Claude"
    browse/             # search / edit / delete
    login/              # passcode
    api/
      cards/            # CRUD + batch create
      review/           # due queue + submit answer
      stats/            # dashboard counts
      ai/define/        # Claude writes a card back
      ai/parse/         # dictation -> structured cards
      auth/             # passcode login
  lib/
    scheduler.ts        # spaced-repetition engine
    anthropic.ts        # Claude calls
    db.ts               # Prisma client
    auth.ts             # single-user passcode
scripts/
  generate-icons.mjs    # PWA icons (no deps)
  smoketest.mjs         # end-to-end API test
```

## Tested

`scripts/smoketest.mjs` runs the full loop against a live server (create card →
appears in due queue with grade previews → grade "Good" → schedules 1 day →
leaves queue → 5-min custom delay → search → delete). All assertions pass.

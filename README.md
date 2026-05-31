# Memory — Spaced Repetition + Claude + Voice

A cross-platform **PWA** for active recall and spaced repetition (an Anki-style
memory app), built to be **dead simple on your phone** and powered by **Claude**.

Open it in a browser, tap *Add to Home Screen*, and it works like a native app —
no App Store, no opening your Mac.

---

## 🚀 Deploy it (one click)

Click this button. It creates the app **and a free database for you
automatically** — you only paste **one** thing: your Anthropic API key.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fraspberrygithub%2Fnewproject&project-name=memory&repository-name=memory&env=ANTHROPIC_API_KEY&envDescription=Your%20Anthropic%20API%20key%20(starts%20with%20sk-ant-)&envLink=https%3A%2F%2Fconsole.anthropic.com%2Fsettings%2Fkeys&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D)

**What happens when you click:**

1. Sign in with GitHub (one tap).
2. Vercel asks for **`ANTHROPIC_API_KEY`** → paste your key from
   <https://console.anthropic.com/settings/keys>.
3. It offers to add a **Neon Postgres** database → click **Add** / accept. (This
   sets `DATABASE_URL` for you — nothing to copy.)
4. Click **Deploy**. ~2 minutes later you get your URL, e.g.
   `https://memory-xxxx.vercel.app`.
5. Open that URL on your phone → **Add to Home Screen**. Done. ✅

That's the whole thing. No connection strings, no passwords, no command line.

> Already made a Supabase database and want to use it instead? See
> [DEPLOY.md](./DEPLOY.md) for the manual route.

---

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

No login/passcode — the app opens straight in.

## AI model

Defaults to **Claude Opus 4.8** with adaptive thinking at **high** effort for
writing definitions and parsing dictation. Override with the `ANTHROPIC_MODEL`
and `ANTHROPIC_EFFORT` (`low`/`medium`/`high`/`xhigh`/`max`) env vars, or set
`ANTHROPIC_THINKING="off"`, if you ever want cheaper/faster.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · Postgres (Neon) ·
Anthropic SDK.

## Local development

```bash
cp .env.example .env     # add your ANTHROPIC_API_KEY + a DATABASE_URL
npx prisma db push       # create tables
npm run db:seed          # optional sample cards
npm run dev              # http://localhost:3000
```

## How scheduling works

`src/lib/scheduler.ts` is the engine. Cards move through `new → learning →
review`. Grading adjusts the ease factor and interval (SM-2); "Again" drops a
review card back into a 5-minute relearning step. `delay()` pushes a card out by
an exact amount for the preset buttons. Every answer is logged to the `Review`
table for stats.

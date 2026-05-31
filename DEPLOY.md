# Deploy guide — get Memory live on your phone

> **Honest note up front:** I built and tested the entire app, but I can't fully
> deploy it *for* you from here. Hosting it under your name needs **your own
> accounts and a payment method on file** (even though everything below is free
> tier): a Vercel account, a Postgres database, and an Anthropic API key. Those
> can't be created without you. What I've done is shrink the job to **one edit +
> pasting 4 values + clicking Deploy** — roughly 10 minutes, no command line.

The app is a **PWA**: once it's at a URL, you open it on your phone and tap *Add
to Home Screen* and it behaves like an installed app. No App Store.

---

## The only manual edit (1 line)

Production uses Postgres (SQLite doesn't persist on serverless hosting). In
`prisma/schema.prisma`, change one line:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Commit it. That's the only code change. (`vercel.json` already creates the
database tables automatically during deployment, so you don't run any CLI.)

## Get the 4 values

1. **Postgres database** — at https://supabase.com create a project →
   *Project Settings → Database → Connection string → URI* (use the pooled one,
   port 6543). This is your `DATABASE_URL`.
2. **Anthropic API key** — https://console.anthropic.com → *API Keys* → create.
   This is your `ANTHROPIC_API_KEY`.
3. **Model** — use `claude-sonnet-4-6`.
4. **Passcode** — pick any code to lock the app, e.g. `4821`.

## Deploy on Vercel

1. https://vercel.com → sign in with GitHub → **Add New… → Project** → import
   this repo.
2. Expand **Environment Variables** and paste in:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | (Supabase URI) |
   | `ANTHROPIC_API_KEY` | `sk-ant-…` |
   | `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
   | `APP_PASSCODE` | your code |

3. Click **Deploy**. ~1 minute later you have `https://<you>.vercel.app`.

## Put it on your phone

1. Open the URL on your phone, enter the passcode.
2. **iPhone/Safari:** Share → *Add to Home Screen*. **Android/Chrome:** ⋮ →
   *Install app*.
3. Launch from the home screen. Done. ✅

**Voice:** you said you'll use your keyboard's built-in dictation — just tap the
text box on the Voice screen, hit your keyboard's 🎤, talk through your cards,
then "Make cards" hands it to Claude to split into front/back. (A browser mic
button is also there on phones that support it.)

---

## Local development (optional)

```bash
cp .env.example .env     # add ANTHROPIC_API_KEY
npx prisma db push       # local SQLite db (keep provider = "sqlite")
npm run db:seed          # optional sample cards
npm run dev              # http://localhost:3000
```

## Scripting via the API

```bash
# Ask Claude to write a definition for a term
curl -X POST https://<you>.vercel.app/api/ai/define \
  -H "Content-Type: application/json" \
  -d '{"front":"What is osmosis?","instructions":"one simple sentence"}'

# Turn dictation into structured cards
curl -X POST https://<you>.vercel.app/api/ai/parse \
  -H "Content-Type: application/json" \
  -d '{"transcript":"Mitochondria, powerhouse of the cell. Next card: define osmosis, look it up."}'

# Create cards
curl -X POST https://<you>.vercel.app/api/cards \
  -H "Content-Type: application/json" \
  -d '{"front":"...","back":"...","tags":["biology"]}'
```

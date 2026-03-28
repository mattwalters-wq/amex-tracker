# Amex Tracker v2

Walters household spend tracker. Next.js 14, Supabase, Recharts, Tailwind.

## Setup

1. Clone and install:
```bash
cd amex-tracker-v2
npm install
```

2. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://cvuznuccqquqqramcqzn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key from Supabase dashboard>
```

3. Add `cycle_start_day` column to Supabase settings table (if not exists):
```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cycle_start_day numeric DEFAULT 22;
```

4. Run locally:
```bash
npm run dev
```

5. Deploy: push to `mattwalters-wq/amex-tracker` via GitHub Desktop, Vercel auto-deploys.

## Vercel environment variables

Set these in the Vercel dashboard under the project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Anthropic API key

Set in the app under Settings. Stored in localStorage only, never sent to any server.

## Default PIN

`2026` (change in Settings after first login)

## Buckets

| Bucket  | Cap         |
|---------|-------------|
| Daily   | $605/week   |
| Splurge | $250/week   |
| Bills   | $1,166/month|
| Savings | No cap      |

Week runs Thursday to Wednesday (pay day = Thursday).
Statement cycle runs 22nd to 21st.

# Cursor Conference Voting App

React + Vite + Tailwind + Supabase (PostgreSQL + anonymous auth).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Anonymous** — enable **Anonymous sign-ins**.
3. **SQL Editor** — paste and run [`supabase/schema.sql`](./supabase/schema.sql).
4. **Project Settings → API** — copy **Project URL** and **anon public** key into `.env` (see `.env.example`).

## Local development

1. Copy environment file and add your Supabase URL and anon key:

```bash
cp .env.example .env
# edit .env
```

2. Install dependencies and start the dev server (do this after `.env` is set):

```bash
npm install
npm run dev
```

## Build

```bash
npm install
npm run build
npm run preview
```

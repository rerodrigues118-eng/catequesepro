# Supabase setup (local / remote)

This file explains how to apply the SQL schema and create buckets for the Catechist Buddy project.

1) Prepare environment

- Copy `.env.example` to `.env` and fill the values:

  - `VITE_SUPABASE_URL` — your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — anon public key
  - `SUPABASE_SERVICE_ROLE_KEY` — service role key (keep secret)

2) Applying the SQL schema

If you are using the Supabase local emulator (CLI):

```bash
# start local emulators (Postgres/Auth/Storage)
supabase start

# apply the SQL schema to the local DB
supabase db reset --file supabase.sql
```

If you need to apply the SQL to a remote project, the simplest approach is to use `psql` with the connection string (provided by Supabase Dashboard > Settings > Database > Connection string):

```bash
# remote apply (example)
PGCONN='postgresql://postgres:password@db.host:5432/postgres'
psql "$PGCONN" -f supabase.sql
```

3) Create storage buckets

Use the provided scripts in `scripts/`:

POSIX (macOS / WSL / Linux):
```bash
chmod +x ./scripts/create_buckets.sh
./scripts/create_buckets.sh
```

Windows PowerShell:
```powershell
.\
\scripts\create_buckets.ps1
```

These scripts use `supabase storage create <bucket>` and will create the following buckets:
- `avatars` (public) — intended for profile images
- `catequizandos` (public) — used by the app for catequizando photos and document attachments
- `catequizandos-backups` (private) — private backups and documents
- `uploads` (private) — general private uploads

4) Invite flow (recommended)

- The current server endpoint creates the `catequista` and `profile`. For production we recommend using Supabase's invitation/reset link flow. After creating the user, call the Supabase REST/Auth API to send a password reset link (or use the Dashboard to invite users).

5) Local dev

After `.env` is configured and schema + buckets are applied, run:

```bash
npm install
npm run dev
```

App will be available at `http://localhost:5173` by default.

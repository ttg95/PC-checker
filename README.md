# PC-checktool

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-ixty3zqg)

## Supabase backend

The app uses Supabase when these Vite env vars are set:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Setup steps:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Deploy `supabase/functions/create-account` as an Edge Function.
4. Set the Edge Function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. Copy `.env.example` to `.env` and fill in the Supabase URL and anon key.

The first self-created account becomes the master account with unlimited credits. After that, additional accounts must be created by the master account through the app. Scan report uploads are stored in the private `scan-reports` storage bucket with metadata in `scan_reports`.

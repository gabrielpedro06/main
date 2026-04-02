# Bizin Manager

## Environment variables

Do not commit `.env`.

Use `.env.example` as the template for local development, then create your own `.env` on your machine with the real values.

Local example:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=marketing@your-domain.pt
BREVO_SENDER_NAME=Your Brand
```

## Local development

Start both the frontend and the marketing API with:

```bash
npm run dev:full
```

If you only need the frontend, use:

```bash
npm run dev
```

## Vercel deploy

Vercel does not read your local `.env` file automatically.

Add the same variables in the Vercel project settings under Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME` if you use it

For production, `BREVO_API_KEY` must exist in Vercel because the serverless function reads it with `process.env.BREVO_API_KEY`.

## Notes

The React + Vite template text was removed from this README because this repository now has its own setup and deployment workflow.

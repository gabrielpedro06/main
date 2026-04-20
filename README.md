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
VITE_TRANSFERGEST_API_BASE=http://localhost:8787
TRANSFERGEST_BREVO_API_KEY=your-transfergest-brevo-api-key
TRANSFERGEST_BREVO_SENDER_EMAIL=transfergest@your-domain.pt
TRANSFERGEST_BREVO_SENDER_NAME=TransferGest
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
- `VITE_TRANSFERGEST_API_BASE` only if TransferGest uses a dedicated external API base URL (do not set to localhost in production)
- `TRANSFERGEST_BREVO_API_KEY`
- `TRANSFERGEST_BREVO_SENDER_EMAIL`
- `TRANSFERGEST_BREVO_SENDER_NAME` if you use it

For production, `BREVO_API_KEY` must exist in Vercel because the serverless function reads it with `process.env.BREVO_API_KEY`.
For TransferGest campaigns, `TRANSFERGEST_BREVO_API_KEY` should also exist in Vercel.

## Supabase Edge Function (CAE por NIF)

Nova function criada: `fetch-caes-sicae`.

Deploy:

```bash
supabase functions deploy fetch-caes-sicae
```

Teste rápido:

```bash
supabase functions serve fetch-caes-sicae --no-verify-jwt
curl -X POST "http://127.0.0.1:54321/functions/v1/fetch-caes-sicae" -H "Content-Type: application/json" -d '{"nif":"509985769"}'
```

## Notes

The React + Vite template text was removed from this README because this repository now has its own setup and deployment workflow.

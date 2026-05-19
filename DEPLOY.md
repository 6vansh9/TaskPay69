# Deployment Guide — TaskPay

## Prerequisites

Install the Supabase CLI:

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

Log in and link to your project:

```bash
supabase login
supabase link --project-ref kgmnrkpnaldwygahjufc
```

---

## Edge Function: auto-release

The `auto-release` function runs on a schedule and automatically releases escrow for contracts that have been in `delivered` status for more than 7 days with no client response.

### Deploy

```bash
supabase functions deploy auto-release
```

That's it. The function is deployed to your linked project immediately.

### Schedule (cron)

To run it automatically every hour, set a cron job in the Supabase dashboard:

1. Go to **Edge Functions** → **auto-release** → **Details**
2. Under **Cron**, add schedule: `0 * * * *`

Or via the CLI once cron scheduling is GA:

```bash
supabase functions deploy auto-release --schedule "0 * * * *"
```

The `supabase/config.toml` already contains:

```toml
[functions.auto-release.cron]
schedule = "0 * * * *"
```

### Environment variables

These are **automatically available** inside Supabase Edge Functions — no manual setup needed:

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |

### Test locally

```bash
supabase start          # starts local Supabase stack
supabase functions serve auto-release --no-verify-jwt

# In another terminal:
curl -i http://localhost:54321/functions/v1/auto-release
```

The function will query your local DB for eligible contracts and process them. Check terminal output for `released N contracts`.

### Test against production

Invoke manually from the dashboard (**Edge Functions** → **auto-release** → **Invoke**) or:

```bash
curl -i https://kgmnrkpnaldwygahjufc.supabase.co/functions/v1/auto-release \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected response:
```json
{ "released": 0, "skipped": 0, "errors": 0 }
```

---

## Next.js app — Production deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all variables from `.env.local` in **Vercel → Project → Settings → Environment Variables**.

### Required environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay publishable key |
| `RAZORPAY_KEY_ID` | Razorpay server key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (starts with `AC`) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID (starts with `VA`) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `NEXT_PUBLIC_APP_URL` | Production URL e.g. `https://taskpay.vercel.app` |

---

## Razorpay webhook

In the Razorpay dashboard, add a webhook pointing to:

```
https://<your-domain>/api/webhooks/razorpay
```

Events to subscribe: `payment.captured`, `payment.failed`

Set the webhook secret to match `RAZORPAY_WEBHOOK_SECRET` in your env.

---

## Demo accounts (seed data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@taskpay.dev | Admin@123 |
| Client | client1@taskpay.dev | Client@123 |
| Client | client2@taskpay.dev | Client@123 |
| Freelancer | dev1@taskpay.dev | Freelancer@123 |
| Freelancer | dev2@taskpay.dev | Freelancer@123 |

All 10 freelancers (`dev1` through `dev10`) use password `Freelancer@123`.

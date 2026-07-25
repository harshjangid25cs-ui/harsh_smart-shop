# Phase 5: DEPLOYMENT MATRIX

The application has been successfully built according to the Production-Grade Generation Loop.

## 1. Supabase Edge Functions Deployment

Deploy the Edge Functions to handle OTP, risk checks, and RTO guard.

```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Link your project
npx supabase link --project-ref eidbfaojsjbyqerzrigp

# 3. Deploy all functions
npx supabase functions deploy cod-workflow
npx supabase functions deploy verify-otp
npx supabase functions deploy check-pincode
npx supabase functions deploy rto-guard
```

## 2. Supabase Cron Setup (RTO Guard)

Go to the Supabase SQL Editor and run this to execute the RTO Guard every 2 hours:

```sql
SELECT cron.schedule(
  'rto-guard-job',
  '0 */2 * * *', -- Every 2 hours
  $$
    SELECT net.http_post(
      url:='https://eidbfaojsjbyqerzrigp.supabase.co/functions/v1/rto-guard',
      headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);
```

## 3. Frontend Deployment (Vercel/Netlify)

The React frontend is ready to deploy. Ensure you set the following environment variables in your hosting provider:

```env
# Frontend Environment Template (.env)
VITE_SUPABASE_URL=https://eidbfaojsjbyqerzrigp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_gw8UO9mxYpwbKyF4K9pCOQ_WNXuoh7q
```

*Note: For the purpose of this template, `config.ts` currently stores these statically, but for a true production deployment, they should be moved to VITE_ environment variables.*

## Completion Checklist:
- [x] Phase 1: Constraints Locked (Mobile + Pincode)
- [x] Phase 2: Schema + Edge Functions built
- [x] Phase 3: React Frontend with state-machine checkout
- [x] Phase 4: Fraud/Velocity/RTO rules built into Edge Functions
- [x] Phase 5: Deployment guide generated

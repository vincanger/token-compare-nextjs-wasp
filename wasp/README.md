# Wasp SaaS Starter

A SaaS starter built with [Wasp](https://wasp.sh/) — functionally equivalent to the [Next.js SaaS Starter](https://github.com/nextjs/saas-starter), used for a side-by-side token count comparison.

## Features

- Marketing landing page (`/`) with animated terminal element
- Pricing page (`/pricing`) that connects to Stripe Checkout
- Dashboard pages with CRUD operations on users/teams
- Basic RBAC with Owner and Member roles
- Subscription management with Stripe Customer Portal
- Email/password authentication (managed by Wasp)
- Activity logging system for user events

## Prerequisites

- **Node.js** (LTS recommended): Install via [nvm](https://github.com/nvm-sh/nvm)
- **Docker**: Required for the managed Postgres database
- **Wasp CLI**: Install via:
  ```bash
  npm i -g @wasp.sh/wasp-cli@latest
  ```

## Getting Started

1. Copy `.env.example` to `.env.server` and add your Stripe keys:
   ```bash
   cp .env.example .env.server
   ```

2. Start the managed Postgres database:
   ```bash
   wasp start db
   ```

3. In a separate terminal, run the database migration:

   ```bash
   wasp db migrate-dev --name initial
   ```

4. Start the app:

   ```bash
   wasp start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

Sign up through `/signup` to create an account. Wasp automatically creates a team and membership on signup via the `onAfterSignup` hook.

## Stripe Webhooks

To listen for Stripe webhooks locally:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Testing Payments

Use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Tech Stack

- **Framework**: [Wasp](https://wasp.sh/)
- **Database**: PostgreSQL (via Prisma)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

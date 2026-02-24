import { stripe } from './payment/stripe'
import type { DbSeedFn } from 'wasp/server'

export const createStripeProductsAndPrices: DbSeedFn = async () => {
  console.log('Creating Stripe products and prices...')

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  })

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800,
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  })

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  })

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200,
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  })

  console.log('Stripe products and prices created successfully.')
}

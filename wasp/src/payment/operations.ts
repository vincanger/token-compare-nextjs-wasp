import type {
  GetStripePrices,
  GetStripeProducts,
  GetCustomerPortalUrl,
  GenerateCheckoutSession,
} from 'wasp/server/operations'
import { HttpError, env } from 'wasp/server'
import Stripe from 'stripe'
import { stripe } from './stripe'
import { z } from 'zod'

export const getStripePrices: GetStripePrices<void, any> = async () => {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring',
  })

  return prices.data.map((price) => ({
    id: price.id,
    productId: typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }))
}

export const getStripeProducts: GetStripeProducts<void, any> = async () => {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  })

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id,
  }))
}

export const getCustomerPortalUrl: GetCustomerPortalUrl<void, string> = async (
  _args,
  context
) => {
  if (!context.user) throw new HttpError(401)

  const membership = await context.entities.TeamMember.findFirst({
    where: { userId: context.user.id },
    include: { team: true },
  })

  if (!membership?.team.stripeCustomerId) {
    throw new HttpError(400, 'No active subscription')
  }

  if (!membership.team.stripeProductId) {
    throw new HttpError(400, 'No active subscription')
  }

  let configuration: Stripe.BillingPortal.Configuration
  const configurations = await stripe.billingPortal.configurations.list()

  if (configurations.data.length > 0) {
    configuration = configurations.data[0]
  } else {
    const product = await stripe.products.retrieve(membership.team.stripeProductId)
    if (!product.active) {
      throw new HttpError(400, "Team's product is not active in Stripe")
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    })
    if (prices.data.length === 0) {
      throw new HttpError(400, 'No active prices found for the product')
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription',
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id),
            },
          ],
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        payment_method_update: {
          enabled: true,
        },
      },
    })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: membership.team.stripeCustomerId,
    return_url: `${env.WASP_WEB_CLIENT_URL}/dashboard`,
    configuration: configuration.id,
  })

  return session.url
}

const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
})

export const generateCheckoutSession: GenerateCheckoutSession<
  { priceId: string },
  { url: string }
> = async (args, context) => {
  const result = checkoutSchema.safeParse(args)
  if (!result.success) {
    throw new HttpError(400, result.error.errors[0].message)
  }
  const { priceId } = result.data

  if (!context.user) throw new HttpError(401)

  const membership = await context.entities.TeamMember.findFirst({
    where: { userId: context.user.id },
    include: { team: true },
  })

  if (!membership) throw new HttpError(400, 'User has no team')

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${env.WASP_WEB_CLIENT_URL}dashboard`,
    cancel_url: `${env.WASP_WEB_CLIENT_URL}pricing`,
    customer: membership.team.stripeCustomerId || undefined,
    client_reference_id: context.user.id,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 7,
    },
  })

  return { url: session.url! }
}

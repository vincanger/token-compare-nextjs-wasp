import type {
  GetStripePrices,
  GetStripeProducts,
  GetCustomerPortalUrl,
  GenerateCheckoutSession,
} from 'wasp/server/operations'
import { HttpError } from 'wasp/server'
import { stripe } from './stripe'

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

  const session = await stripe.billingPortal.sessions.create({
    customer: membership.team.stripeCustomerId,
    return_url: `${process.env.WASP_WEB_CLIENT_URL}/dashboard`,
  })

  return session.url
}

export const generateCheckoutSession: GenerateCheckoutSession<
  { priceId: string },
  { url: string }
> = async ({ priceId }, context) => {
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
    success_url: `${process.env.WASP_WEB_CLIENT_URL}/dashboard`,
    cancel_url: `${process.env.WASP_WEB_CLIENT_URL}/pricing`,
    customer: membership.team.stripeCustomerId || undefined,
    client_reference_id: context.user.id,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
    },
  })

  return { url: session.url! }
}

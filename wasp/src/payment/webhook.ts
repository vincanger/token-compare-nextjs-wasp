import type { StripeWebhook } from 'wasp/server/api'
import type { MiddlewareConfigFn } from 'wasp/server'
import Stripe from 'stripe'
import { stripe } from './stripe'
import express from 'express'

export const stripeWebhookMiddleware: MiddlewareConfigFn = (config) => {
  config.delete('express.json')
  config.set('express.raw', express.raw({ type: 'application/json' }))
  return config
}

export const stripeWebhook: StripeWebhook = async (req, res, context) => {
  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed.', err)
    return res.status(400).json({ error: 'Webhook verification failed.' })
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string
    const team = await context.entities.Team.findFirst({
      where: { stripeCustomerId: customerId },
    })

    if (team) {
      const status = subscription.status
      if (status === 'active' || status === 'trialing') {
        const plan = subscription.items.data[0]?.plan
        await context.entities.Team.update({
          where: { id: team.id },
          data: {
            stripeSubscriptionId: subscription.id,
            stripeProductId: plan?.product as string,
            planName: (plan?.product as any)?.name ?? null,
            subscriptionStatus: status,
          },
        })
      } else if (status === 'canceled' || status === 'unpaid') {
        await context.entities.Team.update({
          where: { id: team.id },
          data: {
            stripeSubscriptionId: null,
            stripeProductId: null,
            planName: null,
            subscriptionStatus: status,
          },
        })
      }
    }
  }

  res.json({ received: true })
}

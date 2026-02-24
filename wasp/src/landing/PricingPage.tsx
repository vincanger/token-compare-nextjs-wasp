import { useState } from 'react'
import { useQuery, getStripePrices, getStripeProducts, generateCheckoutSession } from 'wasp/client/operations'
import { MainLayout } from '../MainLayout'
import { Button } from '../components/ui/button'
import { Check, ArrowRight, Loader2 } from 'lucide-react'

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
}: {
  name: string
  price: number
  interval: string
  trialDays: number
  features: string[]
  priceId?: string
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleCheckout() {
    if (!priceId) return
    setIsPending(true)
    try {
      const { url } = await generateCheckoutSession({ priceId })
      window.location.href = url
    } catch {
      setIsPending(false)
    }
  }

  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">with {trialDays} day free trial</p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        ${price / 100}{' '}
        <span className="text-xl font-normal text-gray-600">per user / {interval}</span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={handleCheckout}
        disabled={isPending || !priceId}
        variant="outline"
        className="w-full rounded-full"
      >
        {isPending ? (
          <><Loader2 className="animate-spin mr-2 h-4 w-4" />Loading...</>
        ) : (
          <>Get Started<ArrowRight className="ml-2 h-4 w-4" /></>
        )}
      </Button>
    </div>
  )
}

export function PricingPage() {
  const { data: prices } = useQuery(getStripePrices)
  const { data: products } = useQuery(getStripeProducts)

  const basePlan = products?.find((p: any) => p.name === 'Base')
  const plusPlan = products?.find((p: any) => p.name === 'Plus')
  const basePrice = prices?.find((p: any) => p.productId === basePlan?.id)
  const plusPrice = prices?.find((p: any) => p.productId === plusPlan?.id)

  return (
    <MainLayout>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={['Unlimited Usage', 'Unlimited Workspace Members', 'Email Support']}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={['Everything in Base, and:', 'Early Access to New Features', '24/7 Support + Slack Access']}
          priceId={plusPrice?.id}
        />
      </div>
    </main>
    </MainLayout>
  )
}

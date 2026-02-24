import { useState } from 'react'
import { useAuth } from 'wasp/client/auth'
import { updateAccount } from 'wasp/client/operations'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Loader2 } from 'lucide-react'

export function GeneralPage() {
  const { data: user } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ error?: string; success?: string }>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await updateAccount({
        name: formData.get('name') as string,
      })
      setMessage(result)
    } catch (err: any) {
      setMessage({ error: err.message })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <DashboardLayout>
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>
      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name" className="mb-2">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter your name"
                defaultValue={user?.identities.email?.id ?? ''}
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="mb-2">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.identities.email?.id ?? ''}
                disabled
              />
            </div>
            {message.error && <p className="text-red-500 text-sm">{message.error}</p>}
            {message.success && <p className="text-green-500 text-sm">{message.success}</p>}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
    </DashboardLayout>
  )
}

import { useState } from 'react'
import { deleteAccount } from 'wasp/client/operations'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Trash2, Loader2 } from 'lucide-react'
import { Link } from 'wasp/client/router'

export function SecurityPage() {
  const [isDeletePending, setIsDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string

    setIsDeletePending(true)
    try {
      const result = await deleteAccount({ password })
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        window.location.href = '/login'
      }
    } catch (err: any) {
      setDeleteError(err.message)
    } finally {
      setIsDeletePending(false)
    }
  }

  return (
    <DashboardLayout>
      <section className="flex-1 p-4 lg:p-8">
        <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
          Security Settings
        </h1>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              To change your password, use the{' '}
              <Link
                to="/request-password-reset"
                className="text-orange-500 hover:text-orange-600 underline"
              >
                password reset
              </Link>{' '}
              flow.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Account deletion is non-reversable. Please proceed with caution.
            </p>
            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <Label htmlFor="delete-password" className="mb-2">
                  Confirm Password
                </Label>
                <Input
                  id="delete-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  placeholder="Enter your password to confirm"
                />
              </div>
              {deleteError && (
                <p className="text-red-500 text-sm">{deleteError}</p>
              )}
              <Button
                type="submit"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeletePending}
              >
                {isDeletePending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  )
}

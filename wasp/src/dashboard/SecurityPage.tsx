import { useState } from 'react'
import { updatePassword, deleteAccount } from 'wasp/client/operations'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Lock, Trash2, Loader2 } from 'lucide-react'

export function SecurityPage() {
  const [passwordState, setPasswordState] = useState<{ error?: string; success?: string }>({})
  const [isPasswordPending, setIsPasswordPending] = useState(false)
  const [isDeletePending, setIsDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handlePasswordUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPasswordPending(true)
    const form = new FormData(e.currentTarget)
    try {
      const result = await updatePassword({
        currentPassword: form.get('currentPassword') as string,
        newPassword: form.get('newPassword') as string,
        confirmPassword: form.get('confirmPassword') as string,
      })
      setPasswordState(result)
    } catch (err: any) {
      setPasswordState({ error: err.message })
    } finally {
      setIsPasswordPending(false)
    }
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsDeletePending(true)
    try {
      await deleteAccount()
      window.location.href = '/login'
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
        <CardHeader><CardTitle>Password</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordUpdate}>
            <div>
              <Label htmlFor="current-password" className="mb-2">Current Password</Label>
              <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required minLength={8} maxLength={100} />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2">New Password</Label>
              <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={100} />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2">Confirm New Password</Label>
              <Input id="confirm-password" name="confirmPassword" type="password" required minLength={8} maxLength={100} />
            </div>
            {passwordState.error && <p className="text-red-500 text-sm">{passwordState.error}</p>}
            {passwordState.success && <p className="text-green-500 text-sm">{passwordState.success}</p>}
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isPasswordPending}>
              {isPasswordPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" />Update Password</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Delete Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Account deletion is non-reversable. Please proceed with caution.
          </p>
          <form onSubmit={handleDelete} className="space-y-4">
            {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
            <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700" disabled={isDeletePending}>
              {isDeletePending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" />Delete Account</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
    </DashboardLayout>
  )
}

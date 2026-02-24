import { useState } from 'react'
import { useQuery, getTeamForUser, removeTeamMember, inviteTeamMember } from 'wasp/client/operations'
import { useAuth } from 'wasp/client/auth'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '../components/ui/button'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { Label } from '../components/ui/label'
import { Loader2, PlusCircle } from 'lucide-react'

function ManageSubscription({ teamData }: { teamData: any }) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                Current Plan: {teamData?.planName || 'Free'}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? 'Billed monthly'
                  : teamData?.subscriptionStatus === 'trialing'
                  ? 'Trial period'
                  : 'No active subscription'}
              </p>
            </div>
            <Button variant="outline">Manage Subscription</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamMembers({ teamData }: { teamData: any }) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')

  const getUserDisplayName = (user: any) => user.name || user.email || 'Unknown User'

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No team members yet.</p>
        </CardContent>
      </Card>
    )
  }

  async function handleRemove(memberId: number) {
    setIsRemoving(true)
    try {
      const result = await removeTeamMember({ memberId })
      if (result.error) setError(result.error)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member: any, index: number) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{getUserDisplayName(member.user)}</p>
                  <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                </div>
              </div>
              {index > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRemoving}
                  onClick={() => handleRemove(member.id)}
                >
                  {isRemoving ? 'Removing...' : 'Remove'}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </CardContent>
    </Card>
  )
}

function InviteTeamMember() {
  const { data: user } = useAuth()
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<{ error?: string; success?: string }>({})

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsInviting(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await inviteTeamMember({
        email: formData.get('email') as string,
        role: formData.get('role') as string,
      })
      setMessage(result)
    } catch (err: any) {
      setMessage({ error: err.message })
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Invite Team Member</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2">Email</Label>
            <Input id="email" name="email" type="email" placeholder="Enter email" required />
          </div>
          <div>
            <Label>Role</Label>
            <RadioGroup defaultValue="member" name="role" className="flex space-x-4">
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">Member</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner">Owner</Label>
              </div>
            </RadioGroup>
          </div>
          {message.error && <p className="text-red-500">{message.error}</p>}
          {message.success && <p className="text-green-500">{message.success}</p>}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isInviting}
          >
            {isInviting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Inviting...</>
            ) : (
              <><PlusCircle className="mr-2 h-4 w-4" />Invite Member</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: teamData, isLoading } = useQuery(getTeamForUser)

  if (isLoading) return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <section className="flex-1 p-4 lg:p-8">
        <h1 className="text-lg lg:text-2xl font-medium mb-6">Team Settings</h1>
        <ManageSubscription teamData={teamData} />
        <TeamMembers teamData={teamData} />
        <InviteTeamMember />
      </section>
    </DashboardLayout>
  )
}

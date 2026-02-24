import { useQuery, getActivityLogs } from 'wasp/client/operations'
import { DashboardLayout } from './DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  SIGN_UP: UserPlus,
  SIGN_IN: UserCog,
  SIGN_OUT: LogOut,
  UPDATE_PASSWORD: Lock,
  DELETE_ACCOUNT: UserMinus,
  UPDATE_ACCOUNT: Settings,
  CREATE_TEAM: UserPlus,
  REMOVE_TEAM_MEMBER: UserMinus,
  INVITE_TEAM_MEMBER: Mail,
  ACCEPT_INVITATION: CheckCircle,
}

const actionLabels: Record<string, string> = {
  SIGN_UP: 'You signed up',
  SIGN_IN: 'You signed in',
  SIGN_OUT: 'You signed out',
  UPDATE_PASSWORD: 'You changed your password',
  DELETE_ACCOUNT: 'You deleted your account',
  UPDATE_ACCOUNT: 'You updated your account',
  CREATE_TEAM: 'You created a new team',
  REMOVE_TEAM_MEMBER: 'You removed a team member',
  INVITE_TEAM_MEMBER: 'You invited a team member',
  ACCEPT_INVITATION: 'You accepted an invitation',
}

function getRelativeTime(date: Date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  return date.toLocaleDateString()
}

export function ActivityPage() {
  const { data: logs, isLoading } = useQuery(getActivityLogs)

  if (isLoading) return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Activity Log
      </h1>
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log: any) => {
                const Icon = iconMap[log.action] || Settings
                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="bg-orange-100 rounded-full p-2">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {actionLabels[log.action] || 'Unknown action'}
                        {log.ipAddress && ` from IP ${log.ipAddress}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getRelativeTime(new Date(log.timestamp))}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                When you perform actions like signing in or updating your account, they'll appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
    </DashboardLayout>
  )
}

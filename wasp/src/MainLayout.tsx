import { useState } from 'react'
import { Link } from 'wasp/client/router'
import { useAuth, logout } from 'wasp/client/auth'
import { Button } from './components/ui/button'
import { Avatar, AvatarFallback } from './components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { CircleIcon, Home, LogOut } from 'lucide-react'

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: user } = useAuth()

  if (!user) {
    return (
      <>
        <Link
          to="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          <Link to="/signup">Sign Up</Link>
        </Button>
      </>
    )
  }

  const email = user.identities.email?.id ?? ''

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarFallback>
            {email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link to="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="w-full flex-1 cursor-pointer" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <CircleIcon className="h-6 w-6 text-orange-500" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              ACME
            </span>
          </Link>
          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </header>
      {children}
    </section>
  )
}

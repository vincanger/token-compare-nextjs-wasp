import {
  LoginForm,
  SignupForm,
  VerifyEmailForm,
  ForgotPasswordForm,
  ResetPasswordForm,
} from 'wasp/client/auth'
import { Link } from 'wasp/client/router'

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div>{children}</div>
      </div>
    </div>
  )
}

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-500">New to our platform? </span>
        <Link to="/signup" className="text-orange-600 hover:text-orange-500">Create an account</Link>
      </div>
    </AuthLayout>
  )
}

export function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-500">Already have an account? </span>
        <Link to="/login" className="text-orange-600 hover:text-orange-500">Sign in</Link>
      </div>
    </AuthLayout>
  )
}

export function EmailVerificationPage() {
  return (
    <AuthLayout>
      <VerifyEmailForm />
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-orange-600 hover:text-orange-500">Go to login</Link>
      </div>
    </AuthLayout>
  )
}

export function RequestPasswordResetPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}

export function PasswordResetPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-orange-600 hover:text-orange-500">Go to login</Link>
      </div>
    </AuthLayout>
  )
}

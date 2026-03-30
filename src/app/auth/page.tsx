import { redirect } from 'next/navigation'

export default function AuthIndexPage() {
  // Redirect to the signin page; keeping /auth as a stable entrypoint for middleware
  redirect('/auth/signin')
}


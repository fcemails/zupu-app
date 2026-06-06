// Route segment config must live in a Server Component — it is ignored when
// placed in a 'use client' file.  This wrapper makes the login page dynamic so
// Next.js never pre-renders or caches the HTML shell.  Without this the server
// serves a stale cached shell (s-maxage=31536000) whose JS chunk references are
// from an old build, causing 404s on every new deployment.
export const dynamic = 'force-dynamic'

import LoginForm from './LoginForm'

export default function LoginPage() {
  return <LoginForm />
}

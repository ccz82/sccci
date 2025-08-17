import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { pb } from '~/lib/pb'

export const Route = createFileRoute('/(auth)/_auth/verify-account/$token')({
  beforeLoad: async () => {
    if (pb.authStore.isValid && pb.authStore.record?.verified) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: async ({ params: { token } }) => {
    return await pb.collection('users').confirmVerification(token)
  },
  errorComponent: ErrorComponent,
  component: RouteComponent,
})

function ErrorComponent() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col gap-2">
        <h1 className="text-destructive text-3xl font-bold">
          Something went wrong.
        </h1>
        <p className="text-muted-foreground text-sm">
          Check your URL again to make sure you entered the right link.
        </p>
      </div>
    </div>
  )
}

function RouteComponent() {
  const navigate = Route.useNavigate()

  const [seconds, setSeconds] = useState(3)

  useEffect(() => {
    const timer =
      seconds > 0 && setInterval(() => setSeconds(seconds - 1), 1000)

    if (seconds === 0) {
      navigate({ to: '/dashboard' })
    }

    return () => clearInterval(timer as NodeJS.Timeout)
  }, [seconds])

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col gap-2">
        <h1 className="text-3xl font-bold">
          Successfully verified your account!
        </h1>
        <p className="text-muted-foreground text-sm">
          Redirecting you to the dashboard in {seconds} seconds...
        </p>
      </div>
    </div>
  )
}

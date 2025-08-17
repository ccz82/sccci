import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { ClientResponseError } from 'pocketbase'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { pb } from '~/lib/pb'

export const Route = createFileRoute('/(auth)/_auth/verify-account/')({
  beforeLoad: async () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: '/signin' })
    } else if (pb.authStore.record?.verified) {
      throw redirect({ to: '/dashboard' })
    } else {
      await pb
        .collection('users')
        .requestVerification(pb.authStore.record?.email)
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()

  const {
    mutate: sendVerificationEmail,
    isPending: sendVerificationEmailIsPending,
  } = useMutation({
    mutationFn: async () => {
      return await pb
        .collection('users')
        .requestVerification(pb.authStore.record?.email)
    },
    onError: (error: ClientResponseError) => {
      if (error.status === 400) {
        toast.error(error.message)
      }
    },
    onSuccess: async () => {
      toast.success('Resent verification email! Check your email inbox.')
    },
  })

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Verify your account</h1>
          <p className="text-muted-foreground text-sm">
            We sent an email with a verification link to your inbox.
          </p>
        </div>
        {sendVerificationEmailIsPending ? (
          <Button className="w-full" disabled>
            <Loader2 className="animate-spin" />
            Sending verification email...
          </Button>
        ) : (
          <Button
            onClick={() =>
              pb.authStore.record?.verified
                ? navigate({ to: '/dashboard' })
                : sendVerificationEmail()
            }
          >
            Resend verification email
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            pb.authStore.clear()
            toast.success('Successfully logged out.')
            navigate({ to: '/signin' })
          }}
        >
          Log Out
        </Button>
      </div>
    </div>
  )
}

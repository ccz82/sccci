import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { ClientResponseError } from 'pocketbase'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { pb } from '~/lib/pb'

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email address is required.' })
    .email({ message: 'Please enter a valid email address.' }),
})

export const Route = createFileRoute('/(auth)/_auth/forgot-password/')({
  beforeLoad: () => {
    if (pb.authStore.isValid) {
      if (pb.authStore.record?.verified) {
        throw redirect({ to: '/dashboard' })
      } else {
        throw redirect({ to: '/verify-account' })
      }
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })

  const {
    mutate: sendResetPasswordEmail,
    isPending: sendResetPasswordEmailIsPending,
    isSuccess: sendResetPasswordEmailIsSuccess,
  } = useMutation({
    mutationFn: async ({ email }: z.infer<typeof formSchema>) => {
      return await pb.collection('users').requestPasswordReset(email)
    },
    onError: (error: ClientResponseError) => {
      if (error.status === 400) {
        toast.error(error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        "We've sent you an email with a link to reset your password.",
      )
    },
  })

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground text-sm">
            {sendResetPasswordEmailIsSuccess
              ? "We've sent you an email with a link to reset your password. Check your email inbox."
              : 'Enter your email below to reset your password.'}
          </p>
        </div>
        {!sendResetPasswordEmailIsSuccess && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                sendResetPasswordEmail(data),
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {sendResetPasswordEmailIsPending ? (
                <Button className="w-full" disabled>
                  <Loader2 className="animate-spin" />
                  Sending...
                </Button>
              ) : (
                <Button type="submit" className="w-full">
                  Send reset link
                </Button>
              )}
            </form>
          </Form>
        )}
        <div className="text-center text-sm">
          <Link
            to="/signin"
            className="text-sm underline-offset-4 hover:underline"
          >
            Go back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

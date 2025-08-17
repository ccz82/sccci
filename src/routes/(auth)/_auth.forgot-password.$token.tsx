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

const formSchema = z
  .object({
    password: z
      .string()
      .min(1, { message: 'Password is required.' })
      .min(8, { message: 'Minimum of 8 characters is required.' })
      .regex(/[0-9]/, {
        message: 'Your password must contain at least 1 number.',
      })
      .regex(/[a-z]/, {
        message: 'Your password must contain at least 1 lowercase character.',
      })
      .regex(/[A-Z]/, {
        message: 'Your password must contain at least 1 uppercase character.',
      })
      .regex(/[`!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?~ ]/, {
        message: 'Your password must contain at least 1 special character.',
      }),
    passwordConfirm: z
      .string()
      .min(1, { message: 'Password confirmation is required.' }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match.',
    path: ['passwordConfirm'],
  })

export const Route = createFileRoute('/(auth)/_auth/forgot-password/$token')({
  beforeLoad: async () => {
    if (pb.authStore.isValid && pb.authStore.record?.verified) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()

  const { token } = Route.useParams()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      passwordConfirm: '',
    },
  })

  const { mutate: resetPassword, isPending: resetPasswordIsPending } =
    useMutation({
      mutationFn: async ({
        password,
        passwordConfirm,
      }: z.infer<typeof formSchema>) => {
        return await pb
          .collection('users')
          .confirmPasswordReset(token, password, passwordConfirm)
      },
      onError: (error: ClientResponseError) => {
        if (error.status === 400) {
          if (error.response.data.token.code === 'validation_invalid_token') {
            toast.error(error.response.data.token.message)
          }
        } else {
          toast.error(error.message)
        }
      },
      onSuccess: async () => {
        toast.success("You've successfully reset your password.")
        navigate({ to: '/signin' })
      },
    })

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground text-sm">Reset your password.</p>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => resetPassword(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {resetPasswordIsPending ? (
              <Button className="w-full" disabled>
                <Loader2 className="animate-spin" />
                Resetting...
              </Button>
            ) : (
              <Button type="submit" className="w-full">
                Reset password
              </Button>
            )}
          </form>
        </Form>
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

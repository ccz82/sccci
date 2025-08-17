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
  password: z.string().min(1, { message: 'Password is required.' }),
})

export const Route = createFileRoute('/(auth)/_auth/signin')({
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
  const navigate = Route.useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { mutate: loginWithPassword, isPending: loginWithPasswordIsPending } =
    useMutation({
      mutationFn: async ({ email, password }: z.infer<typeof formSchema>) => {
        return await pb.collection('users').authWithPassword(email, password)
      },
      onError: (error: ClientResponseError) => {
        if (error.status === 400) {
          form.setError('email', {
            message: 'You have entered an invalid email or password.',
          })
          form.setError('password', {
            message: 'You have entered an invalid email or password.',
          })
        } else {
          toast.error(error.message)
        }
      },
      onSuccess: () => {
        navigate({ to: '/dashboard' })
      },
    })

  const { mutate: googleLogin, isPending: googleLoginIsPending } = useMutation({
    mutationFn: async () => {
      return await pb.collection('users').authWithOAuth2({ provider: 'google' })
    },
    onError: (error: ClientResponseError) => {
      if (error.status === 400) {
        toast.error(error.message)
      }
    },
    onSuccess: () => {
      navigate({ to: '/dashboard' })
    },
  })

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Log In</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email below to log in to your account.
          </p>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => loginWithPassword(data))}
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Password</FormLabel>
                    <Link
                      to="/forgot-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                      tabIndex={-1}
                    >
                      Forgot your password?
                    </Link>
                  </div>
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
            {loginWithPasswordIsPending ? (
              <Button className="w-full" disabled>
                <Loader2 className="animate-spin" />
                Logging in...
              </Button>
            ) : (
              <Button type="submit" className="w-full">
                Log In
              </Button>
            )}
          </form>
        </Form>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2 uppercase">
            Or continue with
          </span>
        </div>
        {googleLoginIsPending ? (
          <Button variant="outline" className="w-full" disabled>
            <Loader2 className="animate-spin" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => googleLogin()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>
        )}
        {/* <div className="text-center text-sm"> */}
        {/*   Don't have an account?{' '} */}
        {/*   <Link */}
        {/*     to="/signup" */}
        {/*     className="text-sm underline-offset-4 hover:underline" */}
        {/*   > */}
        {/*     Sign up */}
        {/*   </Link> */}
        {/* </div> */}
      </div>
    </div>
  )
}

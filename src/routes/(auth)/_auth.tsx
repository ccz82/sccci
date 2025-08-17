import { createFileRoute, Outlet } from '@tanstack/react-router'
import { pb } from '~/lib/pb'

export const Route = createFileRoute('/(auth)/_auth')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          {pb.authStore.isValid ?? 'Logged in as ' + pb.authStore.record?.name}
        </div>
        <Outlet />
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/login_background.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

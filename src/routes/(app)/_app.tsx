import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '~/components/app-sidebar'
import { SidebarProvider } from '~/components/ui/sidebar'
import { protectPage } from '~/lib/auth'

export const Route = createFileRoute('/(app)/_app')({
  beforeLoad: ({ location }) => {
    protectPage(location)
  },
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="flex w-full h-full">
      <SidebarProvider>
        <AppSidebar />
        <main className='flex w-full h-full'>
          <Outlet />
        </main>
      </SidebarProvider>
    </div>
  )
}

import { Label } from '~/components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '~/components/ui/sidebar'


import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '~/components/app-sidebar'
import { Separator } from '~/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar'
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
        <main>
          <Outlet />
        </main>
      </SidebarProvider>
    </div>
  )
}

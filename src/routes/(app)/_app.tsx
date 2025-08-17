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
    <SidebarProvider
      style={
        {
          '--sidebar-width': '330px',
        } as React.CSSProperties
      }
    >
      <AppSidebar>
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">Hello</div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
            </Label>
          </div>
          <SidebarInput placeholder="Type to search..." />
        </SidebarHeader>
        <SidebarContent></SidebarContent>
        <SidebarRail />
      </Sidebar>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <Outlet />

      </AppSidebar>
    </SidebarProvider>
  )
}

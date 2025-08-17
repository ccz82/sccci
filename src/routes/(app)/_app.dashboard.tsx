import { createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '~/components/app-sidebar'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from '~/components/ui/sidebar'
import { pb } from '~/lib/pb'

export const Route = createFileRoute('/(app)/_app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
      </SidebarInset>
    </>
  )
}

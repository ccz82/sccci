import { createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '~/components/app-sidebar'
import { Separator } from '~/components/ui/separator'
import {
  SidebarInset,
  SidebarTrigger,
} from '~/components/ui/sidebar'

export const Route = createFileRoute('/(app)/_app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return "hello"
}

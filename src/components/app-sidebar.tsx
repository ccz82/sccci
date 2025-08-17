import ModeToggle from './mode-toggle'
import { ProfileDialog } from './profile-dialog'
import { Link, LinkProps } from '@tanstack/react-router'
import { BookImage, LayoutDashboard, LucideIcon, NotebookPen } from 'lucide-react'
import { useEffect } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar'

interface SidebarNavItem extends LinkProps {
  name: string
  icon: LucideIcon
}

const sidebarNavItems: SidebarNavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { name: 'Media Library', icon: BookImage, to: '/media' },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, setOpen } = useSidebar()

  useEffect(() => {
    if (!props.children && open) {
      setOpen(false)
    }
  }, [props.children, open])

  return (
    <Sidebar
      collapsible="none"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {sidebarNavItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <Link to={item.to}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        tooltip={{ children: item.name, hidden: false }}
                        isActive={isActive}
                        className="px-2.5 md:px-2"
                      >
                        <item.icon />
                        {item.name}
                      </SidebarMenuButton>
                    )}
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <ModeToggle />
          <ProfileDialog />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

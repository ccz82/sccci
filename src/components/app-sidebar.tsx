import ModeToggle from './mode-toggle'
import { ProfileDialog } from './profile-dialog'
import { Link, LinkProps } from '@tanstack/react-router'
import { BookImage, BookOpenText, Cat, LayoutDashboard, LucideIcon, ScanFace, Palette, Star } from 'lucide-react'
import { useEffect } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar'
import { useTheme } from './theme-provider'

interface SidebarNavItem extends LinkProps {
  name: string
  icon: LucideIcon
}

const sidebarNavItems: SidebarNavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { name: 'Media Library', icon: BookImage, to: '/media' },
  { name: 'People', icon: ScanFace, to: '/people' },
  { name: 'Classifier', icon: LayoutDashboard, to: '/classifier' },
  { name: 'OCR', icon: BookOpenText, to: '/ocr' },
  { name: 'Paintings', icon: Palette, to: '/paintings' },
  { name: 'Cultural Story Creator', icon: Star, to: '/csc' },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, setOpen } = useSidebar()
  const { theme } = useTheme() // get current theme

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
        <SidebarHeader className='m-3'>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="Logo"
          />
        </SidebarHeader>
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

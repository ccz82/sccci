import { useNavigate } from '@tanstack/react-router'
import {
  LockKeyhole,
  LogOut,
  LucideIcon,
  User2,
  UserRoundPen,
} from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '~/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '~/components/ui/sidebar'
import { pb } from '~/lib/pb'

interface ProfileDialogTab {
  name: string
  icon: LucideIcon
}

const profileDialogTabs: ProfileDialogTab[] = [
  { name: 'Profile', icon: UserRoundPen },
  { name: 'Security', icon: LockKeyhole },
]

export function ProfileDialog() {
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('Profile')

  return (
    <SidebarMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton
            tooltip={{
              children: 'Profile',
              hidden: false,
            }}
            isActive={open}
            className="px-2.5 md:px-2"
          >
            <User2 />
            Profile
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent
          className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SidebarProvider
            style={
              {
                '--sidebar-width': '12rem',
              } as React.CSSProperties
            }
            className="items-start"
          >
            <Sidebar
              collapsible="none"
              className="hidden max-h-[500px] md:flex"
            >
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {profileDialogTabs.map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            isActive={item.name === tab}
                            onClick={() => setTab(item.name)}
                          >
                            <item.icon />
                            {item.name}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        pb.authStore.clear()
                        navigate({ to: '/signin' })
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut />
                      Log Out
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>
            <SidebarInset>
            </SidebarInset>
          </SidebarProvider>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}

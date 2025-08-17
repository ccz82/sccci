import { useTheme } from './theme-provider'
import { SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'
import { MoonIcon, SunIcon } from 'lucide-react'
import * as React from 'react'

export default function ModeToggle() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={{ children: 'Theme', hidden: false }}
        className="px-2.5 md:px-2"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        Toggle theme
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

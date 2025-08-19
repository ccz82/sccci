import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '~/components/theme-provider'
import { Toaster } from '~/components/ui/sonner'
import { seo } from '~/lib/seo'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title: 'sccci',
        description: "our sccci project, by us :)"
      }),
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Outlet />
        <Toaster />
        {/*
            not using devtools for now, can comment out
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-right" />
          */}
      </ThemeProvider>
    </>
  )
}

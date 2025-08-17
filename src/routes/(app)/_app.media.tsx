import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_app/media')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(app)/_app/media"!</div>
}

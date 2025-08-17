import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_app/people')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(app)/_app/people"!</div>
}

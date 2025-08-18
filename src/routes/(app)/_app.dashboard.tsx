import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader } from '~/components/ui/card'
import { pb } from '~/lib/pb'

export const Route = createFileRoute('/(app)/_app/dashboard')({
  component: RouteComponent,
})

const dashboardCardItems = [
  { title: "People", }
]

function RouteComponent() {
  return (
    <div className='mx-6 my-5 flex flex-col'>
      <h1 className='my-4 text-3xl font-bold'>
        {pb.authStore.isValid ? 'Welcome back, ' + pb.authStore.record?.name : null}
      </h1>
      <Card>
        <CardHeader>
        </CardHeader>
      </Card>
    </div>
  )
}

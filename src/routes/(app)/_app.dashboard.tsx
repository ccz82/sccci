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
    <div className='w-full mx-6 my-4 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>
          {pb.authStore.isValid ? 'Welcome back, ' + pb.authStore.record?.name : null}
        </h1>
      </div>
      <Card>
        <CardHeader>
        </CardHeader>
      </Card>
    </div>

  )
}

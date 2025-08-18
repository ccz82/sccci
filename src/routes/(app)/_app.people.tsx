import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_app/people')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='mx-6 my-5 flex flex-col'>
      <h1 className='my-4 text-3xl font-bold'>
        People
      </h1>
    </div>
  )
}

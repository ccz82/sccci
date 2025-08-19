import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_app/people')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='w-full mx-6 my-4 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>
          People
        </h1>
      </div>
    </div>
  )
}

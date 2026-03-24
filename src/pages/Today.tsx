import { PageHeader } from '@/components/layout/PageHeader'

export function Today() {
  return (
    <>
      <PageHeader title="Today" subtitle="Daily Production Log" />
      <main className="p-5 pb-24 max-w-lg mx-auto">
        <p className="text-gray-500 text-sm">Today's log — coming soon.</p>
      </main>
    </>
  )
}

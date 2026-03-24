import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'

export function DailyReport() {
  const { id } = useParams<{ id: string }>()
  return (
    <>
      <PageHeader title={id ? 'Edit Report' : 'New Report'} />
      <main className="p-5 pb-24 max-w-lg mx-auto">
        <p className="text-gray-500 text-sm">Daily report form — coming soon.</p>
      </main>
    </>
  )
}

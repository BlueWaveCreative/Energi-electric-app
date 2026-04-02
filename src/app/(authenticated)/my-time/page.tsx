import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function MyTimePage() {
  return (
    <div>
      <PageHeader title="My Time" />
      <div className="p-4 md:p-6">
        <Card>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Time tracking coming in Plan 2</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

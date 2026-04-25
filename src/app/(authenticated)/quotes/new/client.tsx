'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import type { QuoteJobType } from '@/lib/types/database'

interface CustomerOpt {
  id: string
  name: string
}

interface ProjectOpt {
  id: string
  name: string
  customer_id: string
}

interface NewQuoteClientProps {
  customers: CustomerOpt[]
  projects: ProjectOpt[]
}

const JOB_TYPES: { value: QuoteJobType; label: string }[] = [
  { value: 'rough_in', label: 'Rough-In' },
  { value: 'trim_out', label: 'Trim-Out' },
  { value: 'service', label: 'Service' },
]

export function NewQuoteClient({ customers, projects }: NewQuoteClientProps) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [jobType, setJobType] = useState<QuoteJobType>('service')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredProjects = useMemo(
    () => (customerId ? projects.filter((p) => p.customer_id === customerId) : []),
    [customerId, projects],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customerId) {
      setError('Pick a customer.')
      return
    }
    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          project_id: projectId || null,
          title: title.trim(),
          description,
          job_type: jobType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create quote')
      router.push(`/quotes/${data.quote.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote')
      setSubmitting(false)
    }
  }

  if (customers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-600 text-center py-6">
          Add a customer before creating a quote.{' '}
          <Link href="/customers" className="text-[#68BD45] hover:underline">
            Go to Customers →
          </Link>
        </p>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="customer"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Customer <span className="text-red-500">*</span>
          </label>
          <select
            id="customer"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              setProjectId('')
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {filteredProjects.length > 0 && (
          <div>
            <label
              htmlFor="project"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Project (optional)
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
            >
              <option value="">No project</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          id="title"
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. New service panel install"
          required
        />

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (shows on customer-facing invoice)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Will appear as: Provided material and labor for [your description]"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="job_type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Job type <span className="text-red-500">*</span>
          </label>
          <select
            id="job_type"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as QuoteJobType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
          >
            {JOB_TYPES.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/quotes">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create quote'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

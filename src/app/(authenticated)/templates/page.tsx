import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FileStack } from 'lucide-react'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: templates } = await supabase
    .from('project_templates')
    .select('*, template_phases(id, name, sort_order)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Templates"
        actions={
          <Link href="/templates/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Template
            </Button>
          </Link>
        }
      />

      <div className="p-4 md:p-6 space-y-3">
        {!templates?.length ? (
          <div className="text-center py-12">
            <FileStack className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-500">No templates yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create templates to standardize your project phases
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <Card hoverable className="mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {template.template_phases?.length ?? 0} phases
                  </span>
                </div>
                {template.template_phases?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.template_phases
                      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                      .map((phase: { id: string; name: string }) => (
                        <span
                          key={phase.id}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {phase.name}
                        </span>
                      ))}
                  </div>
                )}
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

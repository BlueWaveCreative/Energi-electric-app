import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { TemplateForm } from '@/components/templates/template-form'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: template } = await supabase
    .from('project_templates')
    .select('*, template_phases(*)')
    .eq('id', id)
    .single()

  if (!template) notFound()

  return (
    <div>
      <PageHeader title="Edit Template" />
      <div className="p-4 md:p-6">
        <TemplateForm template={template} />
      </div>
    </div>
  )
}

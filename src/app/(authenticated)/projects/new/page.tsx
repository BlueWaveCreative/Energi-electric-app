import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectForm } from '@/components/projects/project-form'

export default async function NewProjectPage() {
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
    .select('*, template_phases(*)')
    .order('name')

  return (
    <div>
      <PageHeader title="New Project" />
      <div className="p-4 md:p-6">
        <ProjectForm templates={templates ?? []} />
      </div>
    </div>
  )
}

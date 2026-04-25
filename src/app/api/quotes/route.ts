import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'

const VALID_JOB_TYPES = new Set(['rough_in', 'trim_out', 'service'])

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase, userId } = auth

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const {
    customer_id,
    project_id,
    title,
    description,
    job_type,
    valid_until,
    notes,
  } = body as Record<string, unknown>

  if (typeof customer_id !== 'string' || !customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (
    typeof job_type !== 'string' ||
    !VALID_JOB_TYPES.has(job_type)
  ) {
    return NextResponse.json(
      { error: `job_type must be one of ${[...VALID_JOB_TYPES].join(', ')}` },
      { status: 400 },
    )
  }

  const insert: Record<string, unknown> = {
    customer_id,
    title: title.trim(),
    description: typeof description === 'string' ? description : '',
    job_type,
    project_id:
      typeof project_id === 'string' && project_id ? project_id : null,
    valid_until:
      typeof valid_until === 'string' && valid_until ? valid_until : null,
    notes: typeof notes === 'string' ? notes : null,
    created_by: userId,
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert(insert)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create quote' },
      { status: 500 },
    )
  }

  return NextResponse.json({ quote: data }, { status: 201 })
}

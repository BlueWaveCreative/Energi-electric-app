import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { customer_id, project_id, title, issued_date, due_date, notes, tax_amount, line_items } = body

  if (!customer_id || !title || !issued_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      customer_id,
      project_id: project_id || null,
      title,
      issued_date,
      due_date: due_date || null,
      notes: notes || null,
      tax_amount: tax_amount ?? 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create invoice' }, { status: 500 })
  }

  if (line_items && line_items.length > 0) {
    const items = line_items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: idx,
    }))
    const { error: itemsError } = await supabase.from('invoice_line_items').insert(items)
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ invoice }, { status: 201 })
}

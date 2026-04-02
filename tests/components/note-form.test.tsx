import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NoteForm } from '@/components/field/note-form'

describe('NoteForm', () => {
  it('renders textarea and submit button', () => {
    render(<NoteForm onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText('Add a note...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Note' })).toBeInTheDocument()
  })

  it('calls onSubmit with content and clears input', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NoteForm onSubmit={onSubmit} />)

    const textarea = screen.getByPlaceholderText('Add a note...')
    fireEvent.change(textarea, { target: { value: 'Test note content' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Note' }))

    expect(onSubmit).toHaveBeenCalledWith('Test note content')
  })

  it('disables submit when empty', () => {
    render(<NoteForm onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add Note' })).toBeDisabled()
  })
})

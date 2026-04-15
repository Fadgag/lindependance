import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { ModalStackProvider } from '@/components/ui/ModalStackProvider'
import { CustomerPicker } from '@/components/calendar/CustomerPicker'

// Mock Server Action
vi.mock('@/actions/createCustomerAndReturn', () => ({
  createCustomerAndReturn: vi.fn()
}))

import { createCustomerAndReturn } from '@/actions/createCustomerAndReturn'

// Mock toast
vi.mock('@/lib/toast', () => ({ showToast: vi.fn() }))

const CUSTOMERS = [
  { id: 'c1', firstName: 'Alice', lastName: 'Dupont' },
  { id: 'c2', firstName: 'Bob', lastName: 'Martin' }
]

function renderPicker(props: Partial<React.ComponentProps<typeof CustomerPicker>> = {}) {
  const onSelectAction = vi.fn()
  const onCreatedAction = vi.fn()
  render(
    <ModalStackProvider>
      <CustomerPicker
        customers={CUSTOMERS}
        onSelectAction={onSelectAction}
        selectedId={null}
        onCreatedAction={onCreatedAction}
        {...props}
      />
    </ModalStackProvider>
  )
  return { onSelectAction, onCreatedAction }
}

describe('CustomerPicker', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows existing customers list on open', () => {
    renderPicker()
    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    expect(screen.getByText('Alice Dupont')).toBeInTheDocument()
    expect(screen.getByText('Bob Martin')).toBeInTheDocument()
  })

  it('calls onSelectAction when an existing customer is clicked', () => {
    const { onSelectAction } = renderPicker()
    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    fireEvent.mouseDown(screen.getByText('Alice Dupont'))
    expect(onSelectAction).toHaveBeenCalledWith('c1')
  })

  it('shows create button when no customer matches search', () => {
    renderPicker()
    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    const input = screen.getByPlaceholderText('Taper un nom...')
    fireEvent.change(input, { target: { value: 'Fanny' } })
    expect(screen.getByText(/Créer "Fanny"/i)).toBeInTheDocument()
  })

  it('shows inline form when create is clicked', () => {
    renderPicker()
    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    const input = screen.getByPlaceholderText('Taper un nom...')
    fireEvent.change(input, { target: { value: 'Fanny' } })
    fireEvent.mouseDown(screen.getByText(/Créer "Fanny"/i))
    expect(screen.getByPlaceholderText('Prénom *')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nom *')).toBeInTheDocument()
  })

  it('shows validation error when creating without lastName', async () => {
    renderPicker()
    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    fireEvent.change(screen.getByPlaceholderText('Taper un nom...'), { target: { value: 'Fanny' } })
    fireEvent.mouseDown(screen.getByText(/Créer "Fanny"/i))
    fireEvent.mouseDown(screen.getByText('Créer et sélectionner'))
    await waitFor(() => {
      expect(screen.getByText('Prénom et nom requis')).toBeInTheDocument()
    })
  })

  it('calls createCustomerAndReturn and selects the new customer on success', async () => {
    const mockCreate = vi.mocked(createCustomerAndReturn)
    mockCreate.mockResolvedValue({ success: true, customer: { id: 'new1', firstName: 'Fanny', lastName: 'Test', phone: null } })
    const { onSelectAction, onCreatedAction } = renderPicker()

    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    fireEvent.change(screen.getByPlaceholderText('Taper un nom...'), { target: { value: 'Fan' } })
    fireEvent.mouseDown(screen.getByText(/Créer "Fan"/i))

    fireEvent.change(screen.getByPlaceholderText('Prénom *'), { target: { value: 'Fanny' } })
    fireEvent.change(screen.getByPlaceholderText('Nom *'), { target: { value: 'Test' } })
    fireEvent.mouseDown(screen.getByText('Créer et sélectionner'))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ firstName: 'Fanny', lastName: 'Test', phone: null })
      expect(onSelectAction).toHaveBeenCalledWith('new1')
      expect(onCreatedAction).toHaveBeenCalledWith({ id: 'new1', firstName: 'Fanny', lastName: 'Test', phone: null })
    })
  })

  it('auto-selects existing customer on 409 duplicate phone', async () => {
    const mockCreate = vi.mocked(createCustomerAndReturn)
    mockCreate.mockResolvedValue({
      success: false,
      error: 'Un client avec ce numéro existe déjà',
      existing: { id: 'c1', firstName: 'Alice', lastName: 'Dupont', phone: '0600000000' }
    })
    const { onSelectAction } = renderPicker()

    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    fireEvent.change(screen.getByPlaceholderText('Taper un nom...'), { target: { value: 'Fan' } })
    fireEvent.mouseDown(screen.getByText(/Créer "Fan"/i))
    fireEvent.change(screen.getByPlaceholderText('Prénom *'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByPlaceholderText('Nom *'), { target: { value: 'Dup' } })
    fireEvent.change(screen.getByPlaceholderText('Téléphone (optionnel)'), { target: { value: '0600000000' } })
    fireEvent.mouseDown(screen.getByText('Créer et sélectionner'))

    await waitFor(() => {
      expect(onSelectAction).toHaveBeenCalledWith('c1')
    })
  })

  it('cancels creation and returns to search', () => {
    renderPicker()
    fireEvent.mouseDown(screen.getByText('Rechercher un client...'))
    fireEvent.change(screen.getByPlaceholderText('Taper un nom...'), { target: { value: 'Fanny' } })
    fireEvent.mouseDown(screen.getByText(/Créer "Fanny"/i))
    expect(screen.getByPlaceholderText('Prénom *')).toBeInTheDocument()
    // click cancel (X button)
    const cancelBtn = screen.getByRole('button', { name: '' }) // X icon button
    fireEvent.mouseDown(cancelBtn)
    expect(screen.queryByPlaceholderText('Prénom *')).not.toBeInTheDocument()
  })
})


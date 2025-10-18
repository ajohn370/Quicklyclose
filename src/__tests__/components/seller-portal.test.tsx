import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { SellerPortal } from '@/components/features/seller-portal'
import '@testing-library/jest-dom'

describe('SellerPortal', () => {
  it('renders the initial form step', () => {
    render(<SellerPortal />)
    
    expect(screen.getByText('Sell Your Property Fast')).toBeVisible()
    expect(screen.getByText('Tell Us About Yourself')).toBeVisible()
    expect(screen.getByLabelText('Full Name')).toBeVisible()
    expect(screen.getByLabelText('Email')).toBeVisible()
    expect(screen.getByLabelText('Phone')).toBeVisible()
  })

  it('progresses to property details step after seller info submission', async () => {
    const user = userEvent.setup()
    render(<SellerPortal />)
    
    // Fill out seller information
    await user.type(screen.getByLabelText('Full Name'), 'John Doe')
    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Phone'), '555-1234')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    
    // Check if we moved to step 2
    await waitFor(() => {
      expect(screen.getByText('Property Details')).toBeVisible()
    })
  })

  it('shows success message after property submission', async () => {
    const user = userEvent.setup()
    render(<SellerPortal />)
    
    // Step 1: Seller info
    await user.type(screen.getByLabelText('Full Name'), 'John Doe')
    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Phone'), '555-1234')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    
    // Step 2: Property details
    await waitFor(() => {
      expect(screen.getByText('Property Details')).toBeVisible()
    })
    
    await user.type(screen.getByLabelText('Property Address'), '123 Main St')
    await user.type(screen.getByLabelText('City'), 'Austin')
    await user.type(screen.getByLabelText('State'), 'TX')
    await user.type(screen.getByLabelText('ZIP Code'), '78701')
    await user.type(screen.getByLabelText('Square Feet'), '1500')
    
    await user.click(screen.getByRole('button', { name: 'Submit Property' }))
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Property Submitted!')).toBeVisible()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<SellerPortal />)
    
    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    
    // Form should not progress (still on step 1)
    expect(screen.getByText('Tell Us About Yourself')).toBeVisible()
  })

  it('shows progress indicator', () => {
    render(<SellerPortal />)
    
    // Progress bar should be visible
    const progressbar = document.querySelector('[role="progressbar"]')
    expect(progressbar).toBeVisible()
  })
})
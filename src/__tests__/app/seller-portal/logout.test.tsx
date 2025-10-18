import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import SellerLogoutPage from '@/app/seller-portal/logout/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}))

// Mock Header component
jest.mock('@/components/ui/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

const mockPush = jest.fn()
const mockBack = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    back: mockBack,
  })
})

describe('SellerLogoutPage', () => {
  const mockSignOut = jest.fn()

  beforeEach(() => {
    mockSignOut.mockClear()
    mockPush.mockClear()
  })

  it('renders logout page for authenticated seller', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'seller@test.com' },
      userRole: 'seller',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    expect(screen.getByText('Sign Out of Seller Portal')).toBeInTheDocument()
    expect(screen.getByText('You are about to sign out of your seller account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out of seller portal/i })).toBeInTheDocument()
  })

  it('shows logout information and benefits', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'seller@test.com' },
      userRole: 'seller',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    expect(screen.getByText('What happens when you sign out?')).toBeInTheDocument()
    expect(screen.getByText("You'll be signed out of your seller account")).toBeInTheDocument()
    expect(screen.getByText('Your property data will remain saved')).toBeInTheDocument()
    expect(screen.getByText('You can sign back in anytime')).toBeInTheDocument()
  })

  it('handles successful logout', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'seller@test.com' },
      userRole: 'seller',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    const logoutButton = screen.getByRole('button', { name: /sign out of seller portal/i })
    fireEvent.click(logoutButton)

    expect(mockSignOut).toHaveBeenCalledTimes(1)

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('Logged Out Successfully')).toBeInTheDocument()
      expect(screen.getByText('Successfully signed out')).toBeInTheDocument()
    })

    // Should redirect after delay
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/marketing')
    }, { timeout: 3000 })
  })

  it('handles logout error', async () => {
    const errorMessage = 'Logout failed'
    mockSignOut.mockResolvedValue({ error: { message: errorMessage } })
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'seller@test.com' },
      userRole: 'seller',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    const logoutButton = screen.getByRole('button', { name: /sign out of seller portal/i })
    fireEvent.click(logoutButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects non-sellers to marketing page', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'investor@test.com' },
      userRole: 'investor',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    expect(mockPush).toHaveBeenCalledWith('/marketing')
  })

  it('redirects unauthenticated users to marketing page', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      userRole: null,
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    expect(mockPush).toHaveBeenCalledWith('/marketing')
  })

  it('allows cancelling logout', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'seller@test.com' },
      userRole: 'seller',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    const cancelButton = screen.getByRole('button', { name: /cancel & go back/i })
    fireEvent.click(cancelButton)

    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('shows loading state during logout', async () => {
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'seller@test.com' },
      userRole: 'seller',
      signOut: mockSignOut,
    })

    render(<SellerLogoutPage />)

    const logoutButton = screen.getByRole('button', { name: /sign out of seller portal/i })
    fireEvent.click(logoutButton)

    expect(screen.getByText('Signing Out...')).toBeInTheDocument()
    expect(logoutButton).toBeDisabled()
  })
})
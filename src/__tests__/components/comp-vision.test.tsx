import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { CompVision } from '@/components/features/comp-vision'
import '@testing-library/jest-dom'

// Mock the file upload functionality
const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

describe('CompVision', () => {
  it('renders the upload interface', () => {
    render(<CompVision />)
    
    expect(screen.getByText('Comp Vision AI')).toBeVisible()
    expect(screen.getByText('Upload Property Image')).toBeVisible()
    expect(screen.getByText('Click to upload or drag and drop')).toBeVisible()
  })

  it('handles image upload', async () => {
    const user = userEvent.setup()
    render(<CompVision />)
    
    const fileInput = screen.getByRole('button', { name: /upload/i }).closest('div')?.querySelector('input[type="file"]')
    
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, mockFile)
      
      // Check if analyze button becomes enabled
      await waitFor(() => {
        const analyzeButton = screen.getByRole('button', { name: 'Analyze Property' })
        expect(analyzeButton).toBeEnabled()
      })
    }
  })

  it('shows analysis results after processing', async () => {
    const user = userEvent.setup()
    render(<CompVision />)
    
    // Mock the analysis API call
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          features: [
            { name: 'Colonial Style', confidence: 95 }
          ],
          estimatedValue: 490000,
          confidence: 85
        }
      })
    })
    
    const fileInput = screen.getByRole('button', { name: /upload/i }).closest('div')?.querySelector('input[type="file"]')
    
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, mockFile)
      
      const analyzeButton = screen.getByRole('button', { name: 'Analyze Property' })
      await user.click(analyzeButton)
      
      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeVisible()
      })
      
      expect(screen.getByText('Colonial Style')).toBeVisible()
      expect(screen.getByText('95%')).toBeVisible()
      expect(screen.getByText('$490,000')).toBeVisible()
    }
  })

  it('shows loading state during analysis', async () => {
    const user = userEvent.setup()
    render(<CompVision />)
    
    // Mock a delayed API response
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          json: async () => ({ success: true, data: {} })
        }), 100)
      )
    )
    
    const fileInput = screen.getByRole('button', { name: /upload/i }).closest('div')?.querySelector('input[type="file"]')
    
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, mockFile)
      
      const analyzeButton = screen.getByRole('button', { name: 'Analyze Property' })
      await user.click(analyzeButton)
      
      // Check for loading state
      expect(screen.getByText('Analyzing...')).toBeVisible()
    }
  })

  it('handles analysis errors', async () => {
    const user = userEvent.setup()
    render(<CompVision />)
    
    // Mock API error
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))
    
    const fileInput = screen.getByRole('button', { name: /upload/i }).closest('div')?.querySelector('input[type="file"]')
    
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, mockFile)
      
      const analyzeButton = screen.getByRole('button', { name: 'Analyze Property' })
      await user.click(analyzeButton)
      
      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeVisible()
      })
    }
  })

  it('allows multiple file uploads', async () => {
    const user = userEvent.setup()
    render(<CompVision />)
    
    const fileInput = screen.getByRole('button', { name: /upload/i }).closest('div')?.querySelector('input[type="file"]')
    
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, mockFile)
      
      // Upload another file
      const secondFile = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput as HTMLElement, secondFile)
      
      // Should show the new file
      expect(screen.getByDisplayValue('test2.jpg')).toBeVisible()
    }
  })
})
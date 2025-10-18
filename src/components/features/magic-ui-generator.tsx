"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface GeneratedComponent {
  id: string
  name: string
  description: string
  code: string
  preview: string
  tags: string[]
}

export function MagicUIGenerator() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedComponents, setGeneratedComponents] = useState<GeneratedComponent[]>([])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)

    // Simulate AI component generation
    await new Promise(resolve => setTimeout(resolve, 2000))

    const mockComponents: GeneratedComponent[] = [
      {
        id: '1',
        name: 'PropertyCard',
        description: 'A responsive card component for displaying property information',
        code: `
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PropertyCardProps {
  property: {
    address: string
    price: number
    bedrooms: number
    bathrooms: number
    sqft: number
    status: string
  }
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-gray-200 relative">
        <Badge className="absolute top-2 right-2" variant="default">
          {property.status}
        </Badge>
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{property.address}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-green-600">
            $\{property.price.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            {property.bedrooms}bd • {property.bathrooms}ba • {property.sqft.toLocaleString()}sqft
          </div>
        </div>
      </CardContent>
    </Card>
  )
}`,
        preview: 'A beautiful property card with image placeholder, status badge, and property details',
        tags: ['Real Estate', 'Card', 'Responsive']
      },
      {
        id: '2',
        name: 'ContactForm',
        description: 'A modern contact form with validation for lead generation',
        code: `
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Get In Touch</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}`,
        preview: 'A clean contact form with name, email, phone fields and submit button',
        tags: ['Form', 'Lead Generation', 'Validation']
      }
    ]

    setGeneratedComponents(mockComponents)
    setIsGenerating(false)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Magic UI Generator</h1>
        <p className="text-gray-600">Generate React components with AI based on your description</p>
      </div>

      {/* Input Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Describe Your Component</CardTitle>
          <CardDescription>
            Tell us what kind of component you need and we&apos;ll generate it for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt">Component Description</Label>
              <Input
                id="prompt"
                placeholder="e.g., Create a property listing card with image, price, and details"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full"
              />
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full sm:w-auto"
            >
              {isGenerating ? 'Generating...' : 'Generate Component'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Components */}
      {generatedComponents.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Generated Components</h2>
          
          <div className="grid gap-6">
            {generatedComponents.map((component) => (
              <Card key={component.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{component.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {component.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {component.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Preview</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <p className="text-sm text-gray-600">{component.preview}</p>
                      </div>
                    </div>

                    {/* Code */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm text-gray-700">Code</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(component.code)}
                        >
                          Copy Code
                        </Button>
                      </div>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">
                          <code>{component.code}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Example Prompts</CardTitle>
          <CardDescription>Try these example prompts to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div 
              className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setPrompt('Create a property listing card with image, price, bedrooms, bathrooms, and square footage')}
            >
              <h4 className="font-medium mb-1">Property Listing Card</h4>
              <p className="text-sm text-gray-600">A card component for displaying property information</p>
            </div>
            
            <div 
              className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setPrompt('Create a contact form with name, email, phone, and message fields')}
            >
              <h4 className="font-medium mb-1">Contact Form</h4>
              <p className="text-sm text-gray-600">A form for collecting lead information</p>
            </div>
            
            <div 
              className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setPrompt('Create a search bar with filters for property type, price range, and location')}
            >
              <h4 className="font-medium mb-1">Property Search</h4>
              <p className="text-sm text-gray-600">A search interface with filtering options</p>
            </div>
            
            <div 
              className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setPrompt('Create a dashboard widget showing property statistics with charts')}
            >
              <h4 className="font-medium mb-1">Statistics Dashboard</h4>
              <p className="text-sm text-gray-600">A widget for displaying analytics and metrics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
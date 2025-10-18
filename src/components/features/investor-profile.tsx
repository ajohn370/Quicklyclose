"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function InvestorProfile() {
  const { investorProfile, updateInvestorProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    investment_focus: [] as string[],
    minimum_investment: 0,
    maximum_investment: 0,
    preferred_locations: [] as string[],
    phone: ''
  })

  useEffect(() => {
    if (investorProfile) {
      setFormData({
        full_name: investorProfile.full_name || '',
        company_name: investorProfile.company_name || '',
        investment_focus: investorProfile.investment_focus || [],
        minimum_investment: investorProfile.minimum_investment || 0,
        maximum_investment: investorProfile.maximum_investment || 0,
        preferred_locations: investorProfile.preferred_locations || [],
        phone: investorProfile.phone || ''
      })
    }
  }, [investorProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await updateInvestorProfile(formData)
    
    if (error) {
      setMessage('Error updating profile: ' + error.message)
    } else {
      setMessage('Profile updated successfully!')
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayInput = (field: 'investment_focus' | 'preferred_locations', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item)
    handleInputChange(field, items)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Investor Profile</CardTitle>
        <CardDescription>
          Complete your profile to receive better property matches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="company_name">Company Name (Optional)</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimum_investment">Minimum Investment ($)</Label>
              <Input
                id="minimum_investment"
                type="number"
                value={formData.minimum_investment}
                onChange={(e) => handleInputChange('minimum_investment', parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label htmlFor="maximum_investment">Maximum Investment ($)</Label>
              <Input
                id="maximum_investment"
                type="number"
                value={formData.maximum_investment}
                onChange={(e) => handleInputChange('maximum_investment', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="investment_focus">Investment Focus (comma-separated)</Label>
            <Input
              id="investment_focus"
              placeholder="e.g., Single Family, Multi-Family, Commercial"
              value={formData.investment_focus.join(', ')}
              onChange={(e) => handleArrayInput('investment_focus', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="preferred_locations">Preferred Locations (comma-separated)</Label>
            <Input
              id="preferred_locations"
              placeholder="e.g., Austin TX, Dallas TX"
              value={formData.preferred_locations.join(', ')}
              onChange={(e) => handleArrayInput('preferred_locations', e.target.value)}
            />
          </div>

          {message && (
            <div className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
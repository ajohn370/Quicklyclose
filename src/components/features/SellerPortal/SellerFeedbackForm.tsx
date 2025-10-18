'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Star, 
  MessageSquare, 
  Send, 
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Phone,
  Mail,
  Clock
} from 'lucide-react'

interface SellerFeedback {
  feedback_type: 'pricing_feedback' | 'service_feedback' | 'process_feedback' | 'general_feedback'
  subject?: string
  content: string
  rating?: number
  context_data?: Record<string, any>
  requested_response: boolean
  category?: string
  tags?: string[]
}

interface SellerFeedbackFormProps {
  propertyId: string
  sessionToken: string
  feedbackType?: 'pricing_feedback' | 'service_feedback' | 'process_feedback' | 'general_feedback'
  context?: Record<string, any>
  onSubmitted: (feedback: SellerFeedback) => void
  onCancel: () => void
}

export function SellerFeedbackForm({ 
  propertyId, 
  sessionToken, 
  feedbackType = 'general_feedback',
  context = {},
  onSubmitted, 
  onCancel 
}: SellerFeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState<SellerFeedback>({
    feedback_type: feedbackType,
    subject: '',
    content: '',
    rating: undefined,
    context_data: context,
    requested_response: false,
    tags: []
  })

  const handleRatingChange = (rating: number) => {
    setFeedback({ ...feedback, rating })
  }

  const handleTagToggle = (tag: string) => {
    const currentTags = feedback.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    setFeedback({ ...feedback, tags: newTags })
  }

  const handleSubmit = async () => {
    if (!feedback.content.trim()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/seller/properties/${propertyId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(feedback)
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onSubmitted(feedback)
        }, 2000)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const getFeedbackTypeInfo = (type: string) => {
    switch (type) {
      case 'pricing_feedback':
        return {
          title: 'Pricing Feedback',
          description: 'Share your thoughts on our pricing analysis and offer',
          icon: <Star className="h-5 w-5" />,
          color: 'text-green-600'
        }
      case 'service_feedback':
        return {
          title: 'Service Feedback',
          description: 'Help us improve our service quality',
          icon: <ThumbsUp className="h-5 w-5" />,
          color: 'text-blue-600'
        }
      case 'process_feedback':
        return {
          title: 'Process Feedback',
          description: 'Tell us about your experience with our process',
          icon: <Lightbulb className="h-5 w-5" />,
          color: 'text-purple-600'
        }
      default:
        return {
          title: 'General Feedback',
          description: 'Share any thoughts or suggestions',
          icon: <MessageSquare className="h-5 w-5" />,
          color: 'text-gray-600'
        }
    }
  }

  const getAvailableTags = (type: string): string[] => {
    switch (type) {
      case 'pricing_feedback':
        return ['offer_too_low', 'offer_fair', 'offer_too_high', 'needs_clarification', 'market_concerns', 'timing_issues']
      case 'service_feedback':
        return ['excellent_service', 'fast_response', 'professional', 'needs_improvement', 'communication', 'accessibility']
      case 'process_feedback':
        return ['easy_to_use', 'confusing', 'too_complicated', 'missing_information', 'good_flow', 'technical_issues']
      default:
        return ['positive', 'negative', 'suggestion', 'question', 'compliment', 'concern']
    }
  }

  const typeInfo = getFeedbackTypeInfo(feedback.feedback_type)
  const availableTags = getAvailableTags(feedback.feedback_type)

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            {feedback.requested_response && (
              <p>✓ We&apos;ll respond to your feedback within 24 hours</p>
            )}
            <p>✓ Your feedback helps us improve our service</p>
            <p>✓ This window will close automatically</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${typeInfo.color}`}>
          {typeInfo.icon}
          {typeInfo.title}
        </CardTitle>
        <CardDescription>
          {typeInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feedback Type Selection */}
        <div>
          <Label className="text-base font-medium">What type of feedback would you like to provide?</Label>
          <RadioGroup 
            value={feedback.feedback_type} 
            onValueChange={(value) => setFeedback({...feedback, feedback_type: value as any})}
            className="mt-3"
          >
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50">
              <RadioGroupItem value="pricing_feedback" id="pricing" />
              <Label htmlFor="pricing" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Pricing & Offer</span>
                </div>
                <p className="text-sm text-gray-500">Feedback on our pricing analysis and offer</p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-blue-50">
              <RadioGroupItem value="service_feedback" id="service" />
              <Label htmlFor="service" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Service Quality</span>
                </div>
                <p className="text-sm text-gray-500">How did we do? Rate our service</p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-purple-50">
              <RadioGroupItem value="process_feedback" id="process" />
              <Label htmlFor="process" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Process & Experience</span>
                </div>
                <p className="text-sm text-gray-500">Your experience with our process</p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="general_feedback" id="general" />
              <Label htmlFor="general" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">General Feedback</span>
                </div>
                <p className="text-sm text-gray-500">Other thoughts or suggestions</p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Rating for Service Feedback */}
        {feedback.feedback_type === 'service_feedback' && (
          <div>
            <Label className="text-base font-medium">How would you rate our service?</Label>
            <div className="flex items-center gap-2 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(star)}
                  className={`p-1 rounded ${
                    feedback.rating && feedback.rating >= star
                      ? 'text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star className="h-8 w-8 fill-current" />
                </button>
              ))}
              {feedback.rating && (
                <span className="ml-2 text-sm text-gray-600">
                  {feedback.rating} out of 5 stars
                </span>
              )}
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <Label htmlFor="subject">Subject (Optional)</Label>
          <Input
            id="subject"
            value={feedback.subject || ''}
            onChange={(e) => setFeedback({...feedback, subject: e.target.value})}
            placeholder="Brief summary of your feedback"
            className="mt-1"
          />
        </div>

        {/* Feedback Content */}
        <div>
          <Label htmlFor="content">Your Feedback *</Label>
          <Textarea
            id="content"
            value={feedback.content}
            onChange={(e) => setFeedback({...feedback, content: e.target.value})}
            placeholder="Please share your detailed feedback..."
            className="mt-1 min-h-32"
            rows={6}
          />
          <div className="text-sm text-gray-500 mt-1">
            {feedback.content.length}/1000 characters
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label className="text-base font-medium">Select relevant topics (Optional)</Label>
          <div className="flex flex-wrap gap-2 mt-3">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={feedback.tags?.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              >
                {tag.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Response Request */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="response"
            checked={feedback.requested_response}
            onCheckedChange={(checked) => setFeedback({...feedback, requested_response: !!checked})}
          />
          <Label htmlFor="response" className="cursor-pointer">
            I would like a response to this feedback
          </Label>
        </div>

        {feedback.requested_response && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              We&apos;ll respond to your feedback within 24 hours via your preferred contact method.
            </AlertDescription>
          </Alert>
        )}

        {/* Context Information */}
        {Object.keys(context).length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Context Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {context.offer_amount && (
                <div>Current Offer: ${context.offer_amount.toLocaleString()}</div>
              )}
              {context.property_address && (
                <div>Property: {context.property_address}</div>
              )}
              {context.interaction_type && (
                <div>Related to: {context.interaction_type.replace(/_/g, ' ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !feedback.content.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          <p>Your feedback is important to us and helps improve our service.</p>
          <p>All feedback is reviewed by our team and used to enhance the customer experience.</p>
        </div>
      </CardContent>
    </Card>
  )
}
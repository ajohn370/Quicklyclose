'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/ui/header"
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { subjectProperty, albanyComparables, calculateAIValuation } from '@/lib/real-albany-properties'

interface Testimonial {
  id: number
  name: string
  role: string
  location: string
  rating: number
  content: string
  propertyType: string
  saleAmount: string
  timeToClose: string
  avatar?: string
}

const mockTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Property Seller",
    location: "Schenectady, NY",
    rating: 5,
    content: "QuicklyClose made selling my inherited property incredibly easy. I received multiple competitive offers within 48 hours and closed in just 2 weeks. The AI valuation was spot-on and saved me months of uncertainty.",
    propertyType: "Single Family Home",
    saleAmount: "$285,000",
    timeToClose: "14 days",
    avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80"
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    role: "Real Estate Investor",
    location: "Albany, NY",
    rating: 5,
    content: "As an investor, QuicklyClose has revolutionized how I find and acquire properties. The platform's AI analysis gives me confidence in my investment decisions, and the streamlined process means I can move fast on good deals.",
    propertyType: "Multi-Family",
    saleAmount: "$320,000",
    timeToClose: "21 days",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
  },
  {
    id: 3,
    name: "Lisa Chen",
    role: "Property Seller",
    location: "Troy, NY",
    rating: 5,
    content: "After my divorce, I needed to sell quickly without the hassle of traditional real estate. QuicklyClose connected me with serious cash buyers and handled everything professionally. I couldn't be happier with the outcome.",
    propertyType: "Cape Cod",
    saleAmount: "$245,000",
    timeToClose: "18 days",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
  }
]

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {testimonial.avatar ? (
            <Image
              src={testimonial.avatar}
              alt={testimonial.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {testimonial.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
            <p className="text-sm text-gray-600">{testimonial.role}</p>
            <p className="text-sm text-gray-500">{testimonial.location}</p>
          </div>
        </div>
        <Quote className="h-8 w-8 text-blue-200" />
      </div>
      
      <StarRating rating={testimonial.rating} />
      
      <p className="text-gray-700 mt-4 leading-relaxed">{testimonial.content}</p>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Property Type</span>
            <p className="font-medium text-gray-900">{testimonial.propertyType}</p>
          </div>
          <div>
            <span className="text-gray-500">Sale Amount</span>
            <p className="font-medium text-green-600">{testimonial.saleAmount}</p>
          </div>
          <div>
            <span className="text-gray-500">Time to Close</span>
            <p className="font-medium text-blue-600">{testimonial.timeToClose}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  // Calculate real AI valuation using Albany data
  const aiValuation = calculateAIValuation(subjectProperty, albanyComparables)
  const topComps = albanyComparables
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[calc(100vh-3.5rem)] flex items-center justify-center overflow-hidden">
          {/* Background Video */}
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/QCK.mp4" type="video/mp4" />
          </video>
          
          {/* Dark overlay for better text contrast */}
          <div className="absolute inset-0 bg-black/50"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-white drop-shadow-lg">
                Sell Your Home Fast In Just 7 Days
              </h1>
              <div className="mx-auto max-w-[700px] text-xl md:text-2xl text-white drop-shadow-md font-medium space-y-3">
                <p>No agents. No showings. No repairs.</p>
                <p className="text-2xl md:text-3xl font-bold">Just a fair cash offer backed by AI.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 justify-center text-white drop-shadow-md text-lg md:text-xl">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Close on your terms</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>No hassle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Instant cash offers</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link href="/seller-portal">
                <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg font-bold px-12 py-6 text-2xl">
                  Get My Cash Offer
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-center mb-12">
              How QuicklyClose Works
            </h2>
            
            {/* Process Infographic */}
            <div className="flex justify-center mb-16">
              <Image 
                src="/or.png" 
                alt="QuicklyClose Process Flow - Tell us about your home, AI powered analysis, accept cash offer or choose to list with our team, get started today"
                width={1200}
                height={900}
                className="max-w-full h-auto"
              />
            </div>

            {/* Step Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                    Submit Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Fill out our simple form with your property information and upload photos. Takes less than 5 minutes.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                    AI Analysis & Valuation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Our Comp Vision AI analyzes your property photos, finds similar properties, and provides accurate valuations instantly.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                    Receive Cash Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get competitive cash offers from verified investors within 24 hours. Close in as little as 7 days.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* AI Technology Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                    Powered by Comp Vision AI
                  </h2>
                  <p className="max-w-[600px] text-gray-500 md:text-xl">
                    Our proprietary AI technology analyzes property images to identify architectural features, 
                    compare with similar properties, and provide accurate market valuations in real-time.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/investors">
                    <Button>Browse Properties</Button>
                  </Link>
                </div>
              </div>
              <div className="mx-auto bg-gray-50 p-6 rounded-lg max-w-2xl">
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">AI Comp Analysis</h3>
                  <p className="text-sm text-gray-600">Our AI instantly finds and analyzes comparable properties to determine accurate valuations</p>
                </div>
                
                {/* Subject Property */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Subject Property</h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Analysis Complete</span>
                  </div>
                  <div className="mb-2">
                    <div className="font-medium text-sm">{subjectProperty.address}</div>
                    <div className="text-xs text-gray-500">{subjectProperty.city}, {subjectProperty.state} {subjectProperty.zipCode}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Style:</span> {subjectProperty.propertyType}</div>
                    <div><span className="text-gray-500">Exterior:</span> {subjectProperty.exterior}</div>
                    <div><span className="text-gray-500">Size:</span> {subjectProperty.sqft.toLocaleString()} sq ft</div>
                    <div><span className="text-gray-500">Bedrooms:</span> {subjectProperty.bedrooms}</div>
                    <div><span className="text-gray-500">Bathrooms:</span> {subjectProperty.bathrooms}</div>
                    <div><span className="text-gray-500">Built:</span> {subjectProperty.yearBuilt}</div>
                  </div>
                </div>
                
                {/* Comparable Properties Found */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Comparable Properties Found ({albanyComparables.length})
                  </h4>
                  
                  <div className="space-y-3">
                    {topComps.map((comp, index) => {
                      const soldDate = new Date(comp.soldDate)
                      const daysAgo = Math.floor((new Date().getTime() - soldDate.getTime()) / (1000 * 3600 * 24))
                      const timeAgoText = daysAgo < 30 ? `${daysAgo} days ago` : `${Math.floor(daysAgo/30)} month${Math.floor(daysAgo/30) > 1 ? 's' : ''} ago`
                      
                      const isExactMatch = comp.propertyType === subjectProperty.propertyType
                      const isVinylMatch = comp.exterior.includes('Vinyl')
                      
                      return (
                        <div key={comp.id} className="p-3 bg-white rounded border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-sm">{comp.address}</div>
                              <div className="text-xs text-gray-500">{comp.distanceFromSubject} miles away • Sold {timeAgoText}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">${comp.price.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">${comp.pricePerSqft}/sq ft</div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded ${isExactMatch ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                              {isExactMatch ? '✓' : ''} {comp.propertyType}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${isVinylMatch ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                              {isVinylMatch ? '✓' : ''} {comp.exterior}
                            </span>
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">✓ {comp.sqft.toLocaleString()} sq ft</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{comp.matchPercentage}% match</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* AI Valuation Summary */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm mb-3">AI Valuation Summary</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-600">Avg. Comp Price/sq ft</div>
                      <div className="font-semibold">${aiValuation.avgPricePerSqft}/sq ft</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Market Trend (6mo)</div>
                      <div className="font-semibold text-green-600">↑ {aiValuation.marketTrend}%</div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-600">Estimated Value Range</div>
                        <div className="text-lg font-bold">${aiValuation.lowEstimate.toLocaleString()} - ${aiValuation.highEstimate.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">${aiValuation.estimatedValue.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">AI Recommended Price</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {[...Array(Math.min(5, Math.floor(aiValuation.confidenceScore / 20)))].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">
                      Analysis completed with {aiValuation.confidenceScore}% confidence • {aiValuation.comparablesUsed} comps used
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">
                What Our Customers Say
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                See how QuicklyClose has helped property sellers and investors achieve their real estate goals
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">50+</div>
                  <div className="text-gray-600">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-3xl font-bold text-blue-600 mr-2">5.0</span>
                    <StarRating rating={5} />
                  </div>
                  <div className="text-gray-600">Average Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">$2.4M+</div>
                  <div className="text-gray-600">Properties Sold</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {mockTestimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>

            {/* Call to Action */}
            <div className="bg-white rounded-lg p-8 mt-16 text-center shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Join Our Success Stories?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Whether you&apos;re looking to sell your property quickly or find your next investment opportunity, 
                QuicklyClose is here to help you achieve your real estate goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/seller-portal">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Sell Your Property
                  </Button>
                </Link>
                <Link href="/investor-portal">
                  <Button variant="outline" size="lg" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                    Find Investment Properties
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="QuicklyClose Logo" width={120} height={24} />
          <p className="text-xs text-gray-500">© 2024 All rights reserved.</p>
        </div>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/legal/terms-of-use">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/legal/privacy-policy">
            Privacy
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/legal/disclaimers">
            Disclaimers
          </Link>
        </nav>
      </footer>
    </div>
  )
}

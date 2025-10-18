# Zillow API Integration Guide for QuicklyClose Property Analysis

## Overview
Comprehensive guide for integrating Zillow API data into the QuicklyClose property analysis workflow. This document covers all available endpoints, data structures, and implementation strategies for maximum data leverage.

## API Configuration

### Authentication
- **API Key**: `81cd51c088msh8cb80a7b27fe3c0p1dfacejsn12ac496`
- **Host**: `zillow56.p.rapidapi.com`
- **Base URL**: `https://zillow56.p.rapidapi.com`

### Required Headers
```json
{
  "X-RapidAPI-Key": "81cd51c088msh8cb80a7b27fe3c0p1dfacejsn12ac496",
  "X-RapidAPI-Host": "zillow56.p.rapidapi.com",
  "Content-Type": "application/json"
}
```

## Available Endpoints

### 1. Property Search and Details

#### Endpoint: `/search`
**Purpose**: Get specific property details and current valuation data

**Parameters**:
```json
{
  "location": "123 Main Street, Schenectady, NY 12345",
  "home_type": "Houses",
  "sort": "Relevance"
}
```

**Response Data**:
```json
{
  "results": [
    {
      "zpid": "property_id",
      "address": {
        "streetAddress": "123 Main Street",
        "city": "Schenectady",
        "state": "NY",
        "zipcode": "12345"
      },
      "price": 285000,
      "zestimate": 289000,
      "rentZestimate": 2200,
      "homeStatus": "FOR_SALE",
      "homeType": "SINGLE_FAMILY",
      "livingArea": 1650,
      "bedrooms": 3,
      "bathrooms": 2,
      "lotSize": 0.25,
      "yearBuilt": 1965,
      "priceHistory": [
        {
          "date": "2024-01-15",
          "price": 275000,
          "event": "Listed"
        }
      ],
      "taxHistory": [
        {
          "year": 2023,
          "taxPaid": 4200
        }
      ]
    }
  ]
}
```

**Usage in n8n**:
```json
{
  "name": "Zillow Property Lookup",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://zillow56.p.rapidapi.com/search",
    "method": "GET",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        {"name": "location", "value": "={{$json.address.search}}"},
        {"name": "home_type", "value": "Houses"}
      ]
    }
  }
}
```

### 2. Comparable Sales Search

#### Endpoint: `/search_sales`
**Purpose**: Find recently sold comparable properties in the area

**Parameters**:
```json
{
  "location": "Schenectady, NY",
  "radius": "0.5",
  "sold_in_last": "6m",
  "home_type": "Houses",
  "min_beds": "2",
  "max_beds": "5",
  "min_baths": "1",
  "max_baths": "4"
}
```

**Response Data**:
```json
{
  "sales": [
    {
      "zpid": "comp_property_id",
      "address": {
        "streetAddress": "456 Oak Street",
        "city": "Schenectady",
        "state": "NY",
        "zipcode": "12345"
      },
      "soldPrice": 275000,
      "soldDate": "2024-01-15",
      "originalListPrice": 285000,
      "daysOnMarket": 28,
      "livingArea": 1640,
      "bedrooms": 3,
      "bathrooms": 2,
      "lotSize": 0.23,
      "yearBuilt": 1962,
      "homeType": "SINGLE_FAMILY",
      "pricePerSqft": 168,
      "distance": 0.3
    }
  ],
  "totalCount": 25,
  "averageSoldPrice": 278000,
  "averageDaysOnMarket": 32,
  "averagePricePerSqft": 172
}
```

**Usage in n8n**:
```json
{
  "name": "Zillow Comparable Sales",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://zillow56.p.rapidapi.com/search_sales",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        {"name": "location", "value": "={{$json.address.city}}, {{$json.address.state}}"},
        {"name": "radius", "value": "0.5"},
        {"name": "sold_in_last", "value": "6m"},
        {"name": "home_type", "value": "Houses"}
      ]
    }
  }
}
```

### 3. Market Trends and Analysis

#### Endpoint: `/market_data`
**Purpose**: Get neighborhood market trends and historical data

**Parameters**:
```json
{
  "location": "Schenectady, NY",
  "timeframe": "5y"
}
```

**Response Data**:
```json
{
  "market_data": {
    "location": "Schenectady, NY",
    "currentMedianPrice": 285000,
    "priceHistory": [
      {
        "date": "2024-01",
        "medianPrice": 285000,
        "averageDaysOnMarket": 35,
        "salesVolume": 45
      },
      {
        "date": "2023-01",
        "medianPrice": 275000,
        "averageDaysOnMarket": 42,
        "salesVolume": 38
      }
    ],
    "appreciationRates": {
      "1year": 3.6,
      "3year": 4.2,
      "5year": 3.8
    },
    "marketTemperature": "Balanced",
    "inventoryLevel": "Normal",
    "seasonalTrends": {
      "spring": "High activity",
      "summer": "Peak season",
      "fall": "Moderate activity",
      "winter": "Lower activity"
    }
  }
}
```

### 4. Rental Market Analysis

#### Endpoint: `/rentals`
**Purpose**: Get rental market data and comparable rental properties

**Parameters**:
```json
{
  "location": "Schenectady, NY",
  "radius": "1",
  "property_type": "house",
  "min_beds": "2",
  "max_beds": "4"
}
```

**Response Data**:
```json
{
  "rentals": [
    {
      "address": "789 Pine Street, Schenectady, NY",
      "rentPrice": 2200,
      "bedrooms": 3,
      "bathrooms": 2,
      "livingArea": 1650,
      "rentPerSqft": 1.33,
      "distance": 0.8,
      "availabilityDate": "2024-02-01"
    }
  ],
  "marketRentEstimate": 2150,
  "rentRange": {
    "low": 1900,
    "high": 2400
  },
  "averageRentPerSqft": 1.31,
  "vacancyRate": 4.5,
  "rentTrends": {
    "1year": 2.8,
    "3year": 4.1
  }
}
```

### 5. Property Valuation History

#### Endpoint: `/property_details/{zpid}`
**Purpose**: Get detailed property information including valuation history

**Parameters**:
```json
{
  "zpid": "property_zillow_id"
}
```

**Response Data**:
```json
{
  "property": {
    "zpid": "12345678",
    "zestimateHistory": [
      {
        "date": "2024-01-01",
        "zestimate": 289000,
        "change": 2000
      }
    ],
    "priceHistory": [
      {
        "date": "2020-05-15",
        "price": 245000,
        "event": "Sold",
        "source": "MLS"
      }
    ],
    "taxHistory": [
      {
        "year": 2023,
        "taxPaid": 4200,
        "taxAssessment": 210000
      }
    ],
    "propertyDetails": {
      "homeType": "SINGLE_FAMILY",
      "yearBuilt": 1965,
      "livingArea": 1650,
      "lotSize": 10890,
      "parkingType": "Attached Garage",
      "parkingSpaces": 2,
      "heating": "Forced Air",
      "cooling": "Central Air"
    }
  }
}
```

## Advanced Endpoints

### 6. Neighborhood Statistics

#### Endpoint: `/neighborhood_data`
**Purpose**: Get comprehensive neighborhood analysis

**Response Data**:
```json
{
  "neighborhood": {
    "name": "Schenectady Stockade Historic District",
    "walkScore": 65,
    "transitScore": 45,
    "bikeScore": 42,
    "demographics": {
      "medianAge": 38,
      "medianIncome": 52000,
      "ownerOccupied": 68
    },
    "schools": [
      {
        "name": "Schenectady High School",
        "rating": 6,
        "distance": 1.2
      }
    ],
    "amenities": {
      "shopping": ["Walmart", "Price Chopper"],
      "restaurants": ["Downtown establishments"],
      "recreation": ["Central Park", "Erie Canal"]
    },
    "crimeRate": "Below average",
    "employment": {
      "majorEmployers": ["General Electric", "Ellis Hospital"],
      "unemploymentRate": 4.2
    }
  }
}
```

### 7. Market Forecasting

#### Endpoint: `/market_forecast`
**Purpose**: Get market predictions and trend forecasts

**Response Data**:
```json
{
  "forecast": {
    "location": "Schenectady, NY",
    "timeframe": "12_months",
    "predictions": {
      "priceAppreciation": 3.2,
      "marketDirection": "Stable Growth",
      "inventoryTrend": "Stable",
      "demandLevel": "Moderate"
    },
    "factors": [
      "Local employment growth",
      "Interest rate environment",
      "Regional development projects"
    ],
    "confidence": 78
  }
}
```

## Data Processing and Integration

### Comprehensive Data Extraction Function

```javascript
function processZillowData(zillowResponses) {
  const {
    propertyData,
    comparableSales,
    marketTrends,
    rentalData,
    neighborhoodData
  } = zillowResponses;

  return {
    subjectProperty: {
      currentValue: propertyData.zestimate,
      listPrice: propertyData.price,
      specifications: {
        sqft: propertyData.livingArea,
        beds: propertyData.bedrooms,
        baths: propertyData.bathrooms,
        yearBuilt: propertyData.yearBuilt,
        lotSize: propertyData.lotSize
      },
      priceHistory: propertyData.priceHistory,
      taxInfo: propertyData.taxHistory
    },
    
    comparableAnalysis: {
      recentSales: comparableSales.sales.map(sale => ({
        address: sale.address.streetAddress,
        soldPrice: sale.soldPrice,
        soldDate: sale.soldDate,
        daysOnMarket: sale.daysOnMarket,
        pricePerSqft: sale.pricePerSqft,
        similarity: calculateSimilarity(sale, propertyData),
        adjustedPrice: adjustForMarketTiming(sale, marketTrends)
      })),
      marketMetrics: {
        averagePrice: comparableSales.averageSoldPrice,
        averageDaysOnMarket: comparableSales.averageDaysOnMarket,
        averagePricePerSqft: comparableSales.averagePricePerSqft
      }
    },
    
    marketContext: {
      currentTrends: marketTrends.appreciationRates,
      marketTemperature: marketTrends.marketTemperature,
      seasonalFactors: marketTrends.seasonalTrends,
      forecast: marketTrends.forecast
    },
    
    rentalAnalysis: {
      marketRent: rentalData.marketRentEstimate,
      rentRange: rentalData.rentRange,
      rentPerSqft: rentalData.averageRentPerSqft,
      vacancyRate: rentalData.vacancyRate,
      rentGrowth: rentalData.rentTrends
    },
    
    investmentMetrics: {
      capRate: calculateCapRate(rentalData.marketRentEstimate, propertyData.zestimate),
      cashFlow: calculateCashFlow(rentalData.marketRentEstimate, propertyData.zestimate),
      rentToPrice: rentalData.marketRentEstimate / propertyData.zestimate * 12,
      appreciationPotential: marketTrends.appreciationRates['1year']
    }
  };
}
```

### Similarity Scoring Algorithm

```javascript
function calculateSimilarity(comparable, subject) {
  let score = 100;
  
  // Square footage similarity (30% weight)
  const sqftDiff = Math.abs(comparable.livingArea - subject.livingArea) / subject.livingArea;
  score -= sqftDiff * 30;
  
  // Bedroom similarity (20% weight)
  const bedDiff = Math.abs(comparable.bedrooms - subject.bedrooms);
  score -= bedDiff * 20;
  
  // Bathroom similarity (15% weight)
  const bathDiff = Math.abs(comparable.bathrooms - subject.bathrooms);
  score -= bathDiff * 15;
  
  // Age similarity (15% weight)
  const ageDiff = Math.abs(comparable.yearBuilt - subject.yearBuilt) / 50;
  score -= ageDiff * 15;
  
  // Distance penalty (20% weight)
  score -= comparable.distance * 20;
  
  return Math.max(0, Math.min(100, score));
}
```

### Market Timing Adjustments

```javascript
function adjustForMarketTiming(sale, marketTrends) {
  const saleDate = new Date(sale.soldDate);
  const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  // Apply monthly appreciation rate
  const monthlyAppreciation = marketTrends.appreciationRates['1year'] / 12 / 100;
  const adjustmentFactor = 1 + (monthlyAppreciation * monthsAgo);
  
  return Math.round(sale.soldPrice * adjustmentFactor);
}
```

## Error Handling and Rate Limiting

### Rate Limiting Strategy

```javascript
class ZillowAPIManager {
  constructor() {
    this.requestQueue = [];
    this.rateLimitDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
  }
  
  async makeRequest(endpoint, params) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, params, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;
    
    this.processing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const response = await this.executeRequest(request);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    }
    
    this.processing = false;
  }
}
```

### Error Recovery

```javascript
function handleZillowAPIError(error, endpoint) {
  const errorHandlers = {
    429: () => ({ 
      retry: true, 
      delay: 5000,
      message: 'Rate limit exceeded' 
    }),
    404: () => ({ 
      retry: false, 
      fallback: true,
      message: 'Property not found' 
    }),
    500: () => ({ 
      retry: true, 
      delay: 2000,
      message: 'Server error' 
    })
  };
  
  const handler = errorHandlers[error.status] || (() => ({ 
    retry: false, 
    fallback: true 
  }));
  
  return handler();
}
```

## Data Quality and Validation

### Validation Rules

```javascript
function validateZillowData(data) {
  const validationRules = {
    price: (val) => val > 0 && val < 10000000,
    sqft: (val) => val > 200 && val < 20000,
    beds: (val) => val >= 0 && val <= 10,
    baths: (val) => val >= 0 && val <= 10,
    yearBuilt: (val) => val >= 1800 && val <= new Date().getFullYear()
  };
  
  const errors = [];
  
  Object.entries(validationRules).forEach(([field, validator]) => {
    if (data[field] && !validator(data[field])) {
      errors.push(`Invalid ${field}: ${data[field]}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Performance Optimization

### Caching Strategy

```javascript
class ZillowDataCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 3600000; // 1 hour
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  generateKey(endpoint, params) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }
}
```

### Parallel API Calls

```javascript
async function fetchAllZillowData(address) {
  const promises = [
    zillowAPI.search(address),
    zillowAPI.searchSales(address.city, address.state),
    zillowAPI.getMarketData(address.city, address.state),
    zillowAPI.getRentals(address.city, address.state)
  ];
  
  try {
    const [
      propertyData,
      comparableSales,
      marketTrends,
      rentalData
    ] = await Promise.allSettled(promises);
    
    return {
      propertyData: propertyData.status === 'fulfilled' ? propertyData.value : null,
      comparableSales: comparableSales.status === 'fulfilled' ? comparableSales.value : null,
      marketTrends: marketTrends.status === 'fulfilled' ? marketTrends.value : null,
      rentalData: rentalData.status === 'fulfilled' ? rentalData.value : null
    };
  } catch (error) {
    console.error('Error fetching Zillow data:', error);
    throw error;
  }
}
```

This comprehensive Zillow API integration provides QuicklyClose with real-time market data, accurate comparable sales, and detailed investment metrics to enhance the AI-powered property analysis pipeline.
#!/usr/bin/env node

/**
 * Development Setup Helper
 * Checks environment and provides setup instructions
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 QuicklyClose Development Setup\n')

function checkFileExists(filePath, name) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${name} found`)
    return true
  } else {
    console.log(`❌ ${name} missing`)
    return false
  }
}

function checkEnvVariables() {
  console.log('🔍 Checking Environment Variables...')
  
  const envFile = '.env.development'
  if (!fs.existsSync(envFile)) {
    console.log(`❌ ${envFile} not found`)
    return false
  }

  const envContent = fs.readFileSync(envFile, 'utf8')
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'N8N_API_KEY',
    'N8N_WEBHOOK_URL',
    'GOOGLE_API_KEY'
  ]

  let allPresent = true
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
      console.log(`✅ ${varName} configured`)
    } else {
      console.log(`❌ ${varName} missing or not configured`)
      allPresent = false
    }
  })

  return allPresent
}

function checkProjectStructure() {
  console.log('\n📁 Checking Project Structure...')
  
  const requiredFiles = [
    { path: 'package.json', name: 'Package Configuration' },
    { path: 'next.config.js', name: 'Next.js Configuration' },
    { path: 'tailwind.config.ts', name: 'Tailwind Configuration' },
    { path: 'src/components/features/seller-portal.tsx', name: 'Seller Portal Component' },
    { path: 'src/lib/n8n-integration.ts', name: 'n8n Integration Service' },
    { path: 'src/app/api/comp-ai/v1/analyze/route.ts', name: 'Comp AI API Route' },
    { path: 'complete-schema-update.sql', name: 'Database Schema Update' }
  ]

  let allPresent = true
  requiredFiles.forEach(file => {
    if (!checkFileExists(file.path, file.name)) {
      allPresent = false
    }
  })

  return allPresent
}

function generateSetupInstructions() {
  console.log('\n📋 Setup Instructions:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log('\n1. 🗄️ Database Setup:')
  console.log('   • Open Supabase SQL Editor')
  console.log('   • Run: complete-schema-update.sql')
  console.log('   • Verify tables: properties, property_images')
  console.log('   • Check storage bucket: property-images')
  
  console.log('\n2. 🔧 n8n Configuration:')
  console.log('   • Login to: https://quicklyclose.app.n8n.cloud')
  console.log('   • Find: "QuicklyClose Property Analysis Pipeline"')
  console.log('   • Activate workflow (toggle switch)')
  console.log('   • Test webhook: quickly-close-property-analysis')
  
  console.log('\n3. 🚀 Development Server:')
  console.log('   • Run: npm install')
  console.log('   • Run: npm run dev')
  console.log('   • Visit: http://localhost:3000')
  console.log('   • Test: /seller-portal page')
  
  console.log('\n4. 🧪 Testing:')
  console.log('   • Run: node scripts/test-seller-flow.js')
  console.log('   • Run: node scripts/validate-n8n-flow.js')
  console.log('   • Test image upload functionality')
  console.log('   • Verify AI analysis results')
  
  console.log('\n5. 📱 Features to Test:')
  console.log('   • Seller registration and login')
  console.log('   • Property form submission')
  console.log('   • Multiple image uploads (up to 6)')
  console.log('   • AI analysis trigger')
  console.log('   • Results in comp-vision dashboard')
}

function main() {
  const envCheck = checkEnvVariables()
  const structureCheck = checkProjectStructure()
  
  console.log('\n📊 Setup Status:')
  console.log(`Environment: ${envCheck ? '✅' : '❌'}`)
  console.log(`Project Structure: ${structureCheck ? '✅' : '❌'}`)
  
  generateSetupInstructions()
  
  if (envCheck && structureCheck) {
    console.log('\n🎉 Setup looks good! Ready for development.')
  } else {
    console.log('\n⚠️ Setup needs attention. Please complete the steps above.')
  }
}

main()
#!/usr/bin/env node

const fs = require('fs')
const { spawn } = require('child_process')

console.log('🧹 Cleaning Next.js cache and starting development server...')

// Function to remove directory recursively
function removeDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
      console.log(`✅ Removed ${dir}`)
    }
  } catch (error) {
    console.warn(`⚠️  Could not remove ${dir}:`, error.message)
  }
}

// Clean up Next.js cache directories
removeDir('.next')
removeDir('node_modules/.cache')

console.log('🚀 Starting development server...')

// Start the development server
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...')
  devProcess.kill('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  devProcess.kill('SIGTERM')
  process.exit(0)
})

devProcess.on('close', (code) => {
  console.log(`Development server exited with code ${code}`)
  process.exit(code)
})
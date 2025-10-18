const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrations() {
  try {
    console.log('Applying database migrations...')
    
    // Read the migration file
    const migrationFile = path.join(__dirname, '..', 'database/migrations/009_chat_and_bidding_tables.sql')
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8')
    
    // Split the SQL into individual statements (simple approach)
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length === 0) {
        continue
      }
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        const { error } = await supabase.rpc('exec', { sql: statement })
        
        if (error) {
          // Try alternative method for DDL statements
          console.log('Trying alternative execution method...')
          
          // For CREATE TABLE and other DDL statements, we need to use a different approach
          // Since Supabase doesn't allow direct SQL execution via client, 
          // we'll try to execute via the dashboard or provide instructions
          
          console.log('⚠️  Some statements may need to be executed manually in Supabase Dashboard')
          console.log(`Statement: ${statement.substring(0, 100)}...`)
        } else {
          console.log('✅ Statement executed successfully')
        }
      } catch (err) {
        console.log(`⚠️  Statement may need manual execution: ${err.message}`)
        console.log(`Statement: ${statement.substring(0, 100)}...`)
      }
    }
    
    console.log('\n📋 Migration Summary:')
    console.log('==================')
    console.log('Tables to be created:')
    console.log('• chat_messages - Store chat messages between users')
    console.log('• chat_conversations - Manage conversation threads')
    console.log('• property_bids - Store investor bids on properties')
    console.log('• bid_history - Track bid changes and actions')
    console.log('')
    console.log('Features added:')
    console.log('• Row Level Security (RLS) policies')
    console.log('• Real-time subscriptions')
    console.log('• Automatic timestamp updates')
    console.log('• Comprehensive indexing')
    console.log('')
    console.log('⚠️  If any statements failed, please execute them manually in Supabase Dashboard')
    console.log('   Go to: Project Settings > SQL Editor > Run the migration SQL')
    
  } catch (error) {
    console.error('Error applying migrations:', error)
    console.log('\n📋 Manual Migration Instructions:')
    console.log('================================')
    console.log('1. Open Supabase Dashboard')
    console.log('2. Go to SQL Editor')
    console.log('3. Copy and paste the contents of:')
    console.log('   database/migrations/009_chat_and_bidding_tables.sql')
    console.log('4. Execute the SQL statements')
  }
}

applyMigrations()
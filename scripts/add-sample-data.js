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

async function addSampleData() {
  try {
    console.log('Adding sample property data to database...')
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'add-sample-property-data.sql')
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      // If exec_sql doesn't exist, try a different approach
      console.log('Direct SQL execution not available, using API approach...')
      
      // First, check if we have any users
      const { data: users, error: userError } = await supabase.auth.admin.listUsers()
      if (userError) {
        console.error('Error fetching users:', userError)
        return
      }
      
      // Find admin user or first available user
      let userId = null
      const adminUser = users.users.find(u => u.email === 'admin@quicklyclose.com')
      if (adminUser) {
        userId = adminUser.id
      } else if (users.users.length > 0) {
        userId = users.users[0].id
      }
      
      if (!userId) {
        console.error('No users found in database')
        return
      }
      
      console.log('Using user ID:', userId)
      
      // Check if seller profile exists
      const { data: sellerProfiles, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      let sellerId
      if (sellerError || !sellerProfiles) {
        // Create seller profile
        console.log('Creating seller profile...')
        const { data: newSeller, error: createError } = await supabase
          .from('seller_profiles')
          .insert({
            user_id: userId,
            full_name: 'Test Property Seller',
            email: adminUser?.email || 'test@example.com',
            phone: '(555) 123-4567'
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating seller profile:', createError)
          return
        }
        sellerId = newSeller.id
      } else {
        sellerId = sellerProfiles.id
      }
      
      console.log('Using seller ID:', sellerId)
      
      // Clear existing test properties
      await supabase
        .from('properties')
        .delete()
        .or('address.like.%Test Property%,address.like.%Sample House%,address.like.%Demo Property%')
      
      // Insert sample properties
      const properties = [
        {
          seller_id: sellerId,
          address: '123 Test Property Lane',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90210',
          property_type: 'single_family',
          bedrooms: 3,
          bathrooms: 2.0,
          square_feet: 1800,
          year_built: 2005,
          asking_price: 450000,
          listing_price: 450000,
          description: 'Beautiful test property for admin dashboard testing',
          status: 'active',
          current_state: 'submitted',
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          seller_id: sellerId,
          address: '456 Sample House Drive',
          city: 'San Francisco',
          state: 'CA',
          zip_code: '94102',
          property_type: 'condo',
          bedrooms: 2,
          bathrooms: 1.5,
          square_feet: 1200,
          year_built: 2010,
          asking_price: 650000,
          listing_price: 650000,
          description: 'Modern condo with city views - test submission',
          status: 'active',
          current_state: 'under_review',
          confidence_score: 85,
          submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          seller_id: sellerId,
          address: '789 Demo Property Street',
          city: 'San Diego',
          state: 'CA',
          zip_code: '92101',
          property_type: 'townhouse',
          bedrooms: 4,
          bathrooms: 2.5,
          square_feet: 2200,
          year_built: 2000,
          asking_price: 520000,
          listing_price: 520000,
          description: 'Spacious townhouse for testing purposes',
          status: 'active',
          current_state: 'analysis_completed',
          confidence_score: 92,
          submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      const { data: insertedProperties, error: insertError } = await supabase
        .from('properties')
        .insert(properties)
        .select()
      
      if (insertError) {
        console.error('Error inserting properties:', insertError)
        return
      }
      
      console.log(`Successfully inserted ${insertedProperties.length} sample properties`)
      
      // Verify the data
      const { data: verifyData, error: verifyError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          current_state,
          listing_price,
          confidence_score,
          seller_profiles!inner (
            full_name,
            email
          )
        `)
        .or('address.like.%Test Property%,address.like.%Sample House%,address.like.%Demo Property%')
      
      if (verifyData) {
        console.log('\nVerification - Properties in database:')
        verifyData.forEach(p => {
          const seller = Array.isArray(p.seller_profiles) ? p.seller_profiles[0] : p.seller_profiles
          console.log(`- ${p.address}: ${p.current_state} ($${p.listing_price}) - ${seller?.full_name || 'Unknown'}`)
        })
      }
    } else {
      console.log('Sample data added successfully')
    }
    
  } catch (error) {
    console.error('Error adding sample data:', error)
  }
}

addSampleData()
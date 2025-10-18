const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLatestSubmissions() {
  console.log('🔍 Checking Production Database for Latest Submissions\n');
  console.log('=' + '='.repeat(50));
  
  try {
    // Check latest properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (propError) {
      console.error('Error fetching properties:', propError);
    } else {
      console.log('\n📍 Latest Properties:');
      console.log('-'.repeat(50));
      properties.forEach((prop, i) => {
        console.log(`\n${i + 1}. Property ID: ${prop.id}`);
        console.log(`   Address: ${prop.address}`);
        console.log(`   City: ${prop.city}, ${prop.state} ${prop.zip}`);
        console.log(`   Details: ${prop.bedrooms}BR/${prop.bathrooms}BA, ${prop.sqft} sqft`);
        console.log(`   Status: ${prop.status || 'pending'}`);
        console.log(`   Created: ${new Date(prop.created_at).toLocaleString()}`);
        if (prop.estimated_value) {
          console.log(`   Estimated Value: $${prop.estimated_value.toLocaleString()}`);
        }
      });
    }
    
    // Check latest seller profiles
    const { data: sellers, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (sellerError) {
      console.error('Error fetching sellers:', sellerError);
    } else {
      console.log('\n\n👤 Latest Seller Profiles:');
      console.log('-'.repeat(50));
      sellers.forEach((seller, i) => {
        console.log(`\n${i + 1}. Seller ID: ${seller.id}`);
        console.log(`   Name: ${seller.name}`);
        console.log(`   Email: ${seller.email}`);
        console.log(`   Phone: ${seller.phone}`);
        console.log(`   Created: ${new Date(seller.created_at).toLocaleString()}`);
      });
    }
    
    // Check for any comp_vision_analyses
    const { data: analyses, error: analysisError } = await supabase
      .from('comp_vision_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (!analysisError && analyses && analyses.length > 0) {
      console.log('\n\n🤖 AI Analysis Results:');
      console.log('-'.repeat(50));
      analyses.forEach((analysis, i) => {
        console.log(`\n${i + 1}. Analysis ID: ${analysis.id}`);
        console.log(`   Property ID: ${analysis.property_id}`);
        console.log(`   Status: ${analysis.status}`);
        console.log(`   Created: ${new Date(analysis.created_at).toLocaleString()}`);
        if (analysis.analysis_result) {
          console.log(`   Has Results: Yes`);
        }
      });
    } else {
      console.log('\n\n🤖 AI Analysis Results: None found');
    }
    
    // Check for property_images
    const { data: images, error: imgError } = await supabase
      .from('property_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!imgError && images && images.length > 0) {
      console.log('\n\n📸 Latest Property Images:');
      console.log('-'.repeat(50));
      images.forEach((img, i) => {
        console.log(`\n${i + 1}. Image ID: ${img.id}`);
        console.log(`   Property ID: ${img.property_id}`);
        console.log(`   URL: ${img.image_url}`);
        console.log(`   Uploaded: ${new Date(img.created_at).toLocaleString()}`);
      });
    } else {
      console.log('\n\n📸 Property Images: None uploaded yet');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkLatestSubmissions();
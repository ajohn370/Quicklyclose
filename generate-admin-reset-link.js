const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create admin client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function generateResetLink() {
  try {
    console.log('🔑 Generating password reset link for admin account...\n');
    
    // Generate password reset link for the admin user
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: 'kay@quicklyclose.com',
      options: {
        redirectTo: `https://quickly-close-app.vercel.app/admin/setup`
      }
    });

    if (error) {
      console.error('❌ Error generating reset link:', error.message);
      return;
    }

    if (data && data.properties) {
      console.log('✅ Password Reset Link Generated Successfully!\n');
      console.log('🔗 Click this link to set your password:');
      console.log('=' + '='.repeat(80));
      console.log(data.properties.action_link);
      console.log('=' + '='.repeat(80));
      console.log('\n📋 Instructions:');
      console.log('1. Copy the link above');
      console.log('2. Open it in your browser');
      console.log('3. Set your new password');
      console.log('4. You\'ll be redirected to the admin setup page');
      console.log('5. Then go to https://quickly-close-app.vercel.app/admin to login');
      console.log('\n🎯 Admin Credentials:');
      console.log('Email: kay@quicklyclose.com');
      console.log('Password: (set via the link above)');
      console.log('Role: Super Admin');
    } else {
      console.log('❌ No reset link data returned');
    }

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

generateResetLink();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

// You'll need to get the service role key from Vercel dashboard
// Or from your Supabase dashboard > Settings > API > service_role secret
const SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with actual key

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function setAdminPassword() {
  try {
    console.log('🔑 Setting password for admin account...\n');
    
    // First, let's check if the user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return;
    }
    
    const adminUser = users.users.find(user => user.email === 'kay@quicklyclose.com');
    
    if (!adminUser) {
      console.error('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.email);
    console.log('User ID:', adminUser.id);
    
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        password: 'AdminPass123!',
        email_confirm: true
      }
    );

    if (error) {
      console.error('❌ Error setting password:', error.message);
      return;
    }

    console.log('\n🎉 Password Set Successfully!\n');
    console.log('📋 Admin Login Credentials:');
    console.log('=' + '='.repeat(40));
    console.log('URL: https://quickly-close-app.vercel.app/admin');
    console.log('Email: kay@quicklyclose.com');
    console.log('Password: AdminPass123!');
    console.log('Role: Super Admin');
    console.log('=' + '='.repeat(40));
    console.log('\n🔐 Security Note: Change this password after first login!');

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

console.log('⚠️  SETUP REQUIRED:');
console.log('1. Get your SUPABASE_SERVICE_ROLE_KEY from:');
console.log('   - Vercel Dashboard > Environment Variables');
console.log('   - OR Supabase Dashboard > Settings > API > service_role');
console.log('2. Replace YOUR_SERVICE_ROLE_KEY_HERE in this file');
console.log('3. Run the script again\n');

if (SERVICE_ROLE_KEY !== 'YOUR_SERVICE_ROLE_KEY_HERE') {
  setAdminPassword();
} else {
  console.log('💡 Please update the SERVICE_ROLE_KEY in the script first.');
}
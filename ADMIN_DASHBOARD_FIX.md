# Admin Dashboard Seller Submissions Tab - Fix Instructions

## Issue
The seller submission tab on the admin page is not populated with data.

## Root Cause
The admin dashboard expects certain fields in the `properties` table that don't currently exist in the database schema:
- `listing_price` (the API expects this instead of `asking_price`)
- `confidence_score` (property-level confidence score)
- `current_state` (property workflow state)
- `submitted_at` (submission timestamp)
- `state_transitions` table (for tracking state changes)

## Solution

### Step 1: Apply Database Migrations
Run the following SQL script in your Supabase SQL Editor to add the missing fields and create necessary tables:

```sql
-- Run the contents of fix-admin-dashboard-corrected.sql
```

**Important:** Use the **corrected** version of the script which fixes the column name issues (seller_profiles.full_name vs seller_profiles.name).

This script will:
1. Add missing columns to the properties table
2. Create the state_transitions table
3. Set up proper indexes and RLS policies
4. Insert sample data for testing (if no properties exist)

### Step 2: Verify the Changes
After running the migration, verify that:
1. The properties table has the new columns
2. The state_transitions table exists
3. Sample data is present (if the database was empty)

### Step 3: Test the Admin Dashboard
1. Navigate to `/admin` in your application
2. Click on the "Submissions" tab
3. You should now see property submissions displayed in the table

## Files Modified/Created

### Modified:
- `/src/app/api/admin/properties/submissions/route.ts` - Fixed to use `full_name` instead of `name` from seller_profiles

### Created:
- `/database/migrations/008_add_missing_property_fields.sql` - Migration to add missing fields
- `/database/sample_data/insert_sample_properties.sql` - Sample data insertion script
- `/fix-admin-dashboard-corrected.sql` - Complete fix script to run in Supabase (CORRECTED VERSION)

## API Endpoint
The admin dashboard fetches data from `/api/admin/properties/submissions` which expects:
- Properties with `listing_price`, `current_state`, `confidence_score`, and `submitted_at` fields
- Related `seller_profiles` data
- Related `comp_vision_analyses` data (optional)
- Related `state_transitions` data (optional)

## Testing Checklist
- [ ] Run the fix-admin-dashboard.sql script in Supabase SQL Editor
- [ ] Verify the script completes without errors
- [ ] Check that sample data was inserted (if database was empty)
- [ ] Navigate to /admin and click on "Submissions" tab
- [ ] Verify that properties are displayed in the table
- [ ] Test sorting and filtering functionality
- [ ] Test state transition actions (if admin permissions are set up)

## Troubleshooting

### If no data appears after running the script:
1. Check if there are any seller_profiles in the database
2. Ensure the admin user has proper permissions (admin_profiles table)
3. Check browser console for API errors
4. Verify that the API endpoint returns data: `/api/admin/properties/submissions`

### If you get permission errors:
1. Ensure the admin user exists in the admin_profiles table
2. Check that RLS policies are properly configured
3. Verify the user's role has the necessary permissions

## Next Steps
After fixing the immediate issue:
1. Consider applying all migrations in `/database/migrations/` folder for complete feature set
2. Set up proper admin user creation workflow
3. Implement automated migration running on deployment
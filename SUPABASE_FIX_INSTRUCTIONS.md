# Supabase Password Reset Fix Instructions

## Problem
Password reset emails are redirecting to localhost instead of the production URL.

## Solution

### 1. Update Supabase Dashboard Settings

1. Go to https://app.supabase.com and select your project
2. Navigate to **Authentication** → **Email Templates**
3. Select **Reset Password** template
4. Replace the template content with:

```html
<h2>Reset Your Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### 2. Update URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Set these values:

**Site URL:**
```
https://quickly-close-app.vercel.app
```

**Redirect URLs (one per line):**
```
https://quickly-close-app.vercel.app/**
https://quickly-close-app.vercel.app/reset-password
https://quickly-close-app.vercel.app/marketing
https://quickly-close-app.vercel.app/seller-portal
https://quickly-close-app.vercel.app/investor-portal
```

### 3. Update Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add/Update:
   - `NEXT_PUBLIC_APP_URL` = `https://quickly-close-app.vercel.app`

### 4. Clear Browser Cache

After making these changes:
1. Clear your browser cache
2. Try the password reset flow again

## Verification

To verify the fix:
1. Request a password reset
2. Check the email - the link should point to `https://quickly-close-app.vercel.app/reset-password`
3. Click the link and confirm it works

## If Issues Persist

If you still see localhost in emails:
1. Check Supabase Auth → Settings → Make sure "Enable email confirmations" is ON
2. Check if you have any custom email hooks or functions that might override the URL
3. Contact Supabase support with your project ID
# Email Templates for QuicklyClose

This directory contains custom email templates for Supabase Auth.

## Templates

### Password Reset
- `password-reset.html` - HTML version with styled layout
- `password-reset.txt` - Plain text version for email clients that don't support HTML

## Setup Instructions

### 1. Configure in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Settings**
3. Scroll down to **Email Templates**
4. Select **Reset Password** template
5. Replace the default template with the contents of `password-reset.html`

### 2. Available Variables

Supabase provides these variables in email templates:

- `{{ .ConfirmationURL }}` - The password reset link
- `{{ .SiteURL }}` - Your site's base URL
- `{{ .Data.full_name }}` - User's full name (if available)
- `{{ .Data.portal_name }}` - Portal name (Investor Portal, Seller Portal, Admin Dashboard)

### 3. Portal-Specific Customization

The template automatically shows the appropriate portal name based on the user's context:
- Investor Portal (default)
- Seller Portal  
- Admin Dashboard

### 4. Testing

Test the email templates by:

1. Using the forgot password flow on your application
2. Checking that emails are delivered with proper styling
3. Verifying that all links work correctly
4. Testing on both HTML and plain text email clients

### 5. Customization

You can customize the templates by:

- Updating colors and fonts in the CSS
- Adding your company logo
- Modifying the messaging
- Adding additional security warnings
- Including contact information

### 6. Security Considerations

The templates include:
- Clear expiration time (1 hour)
- Security warnings about unauthorized requests
- Instructions to ignore if not requested
- No-reply messaging to prevent confusion

## File Structure

```
email-templates/
├── README.md                 # This file
├── password-reset.html       # HTML template
└── password-reset.txt        # Plain text template
```
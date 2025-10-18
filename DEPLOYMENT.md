# 🚀 Deployment Checklist

## Vercel Deployment Requirements

### ✅ Environment Variables Required

**Critical**: These must be configured in Vercel Project Settings → Environment Variables

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://fqwhhtalsbxseektaunv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_supabase_anon_key]
SUPABASE_SERVICE_ROLE_KEY=[your_supabase_service_role_key]

# GitHub Integration (OPTIONAL)
GITHUB_ACCESS_TOKEN=[your_github_token]
```

### 🔧 How to Configure Environment Variables

1. **Go to Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. **Add each variable** with exact names above
4. **Set Environment** to: `Production`, `Preview`, `Development`
5. **Save** all variables

### ⚠️ Common Issues

**404 NOT_FOUND during deployment**
- **Cause**: Missing Supabase environment variables
- **Fix**: Add all required environment variables in Vercel
- **Error pattern**: `iad1::xxxxx-timestamp-xxxxx`

**Authentication errors**
- **Cause**: Invalid Supabase keys or URLs
- **Fix**: Verify keys are correct and haven't expired

### 🧪 Pre-Deployment Testing

```bash
# Test build locally
npm run build

# Verify environment variables are working
npm run dev

# Check for TypeScript errors
npm run type-check
```

### 📝 Deployment Steps

1. **Configure environment variables** (see above)
2. **Push changes** to main branch
3. **Verify automatic deployment** in Vercel dashboard
4. **Test deployed application** functionality
5. **Monitor deployment logs** for any errors

---

**⚡ Quick Fix for 404 Errors**: Check Vercel environment variables first!
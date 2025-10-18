# Authentication Architecture Redesign
## Unified Multi-Role Authentication System

### Executive Summary
This document outlines the redesign of QuicklyClose's authentication system to support single email registration with multiple role-based profiles, where roles are automatically assumed based on the portal accessed.

---

## 1. Current State Analysis

### Existing Architecture Issues
- **Separate profile tables**: `investor_profiles`, `seller_profiles`, `admin_profiles`
- **One-to-one user mapping**: Each auth.users entry links to single profile type
- **Fixed role assignment**: Role determined at signup and cannot be changed
- **Limited flexibility**: Users need separate emails for different roles

### Current Database Schema
```sql
-- Three separate profile tables
investor_profiles (user_id UNIQUE)
seller_profiles (user_id UNIQUE)  
admin_profiles (user_id UNIQUE)

-- Role determined by trigger on signup
handle_new_user() → Creates profile based on metadata.role
```

---

## 2. Proposed Architecture

### Core Design Principles
1. **Single User, Multiple Roles**: One email can have seller, investor, and admin capabilities
2. **Context-Based Role Assumption**: Active role determined by portal being accessed
3. **Unified Profile Management**: Central user profile with role-specific extensions
4. **Backward Compatibility**: Existing data migration without disruption

### New Database Schema

```sql
-- Core user profiles table (unified)
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('seller', 'investor', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Role-specific data tables (optional attributes)
CREATE TABLE public.seller_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    company_name TEXT,
    license_number TEXT,
    preferred_regions JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.investor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    investment_range JSONB DEFAULT '{}',
    property_preferences JSONB DEFAULT '{}',
    accreditation_status TEXT,
    investment_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.admin_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    admin_level TEXT DEFAULT 'admin' CHECK (admin_level IN ('super_admin', 'admin', 'analyst', 'support')),
    department TEXT,
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session context table (tracks active role per session)
CREATE TABLE public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    active_role TEXT NOT NULL CHECK (active_role IN ('seller', 'investor', 'admin')),
    portal_context TEXT NOT NULL CHECK (portal_context IN ('seller_portal', 'investor_portal', 'admin_portal')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON public.user_sessions(expires_at);
```

---

## 3. Authentication Flow Design

### Portal-Based Role Assumption

```typescript
// Role assumption based on portal access
interface RoleContext {
  portal: 'seller' | 'investor' | 'admin'
  assumedRole: 'seller' | 'investor' | 'admin'
  availableRoles: Role[]
  canSwitchRole: boolean
}

// Authentication flow
1. User visits portal (e.g., /seller-portal)
2. System checks user_roles for matching role
3. If role exists → Assume role automatically
4. If role doesn't exist → Offer role registration
5. Create/update session with active role
```

### API Authentication Enhancement

```typescript
// Enhanced authentication middleware
export async function getAuthenticatedUserWithRole(
  request: NextRequest,
  requiredRole?: Role
): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(request)
  if (!user) return null

  // Get active role from session or portal context
  const activeRole = await getActiveRole(user.id, request)
  
  // Verify role permissions if required
  if (requiredRole && activeRole !== requiredRole) {
    const hasRole = await userHasRole(user.id, requiredRole)
    if (!hasRole) return null
  }

  return {
    ...user,
    activeRole,
    availableRoles: await getUserRoles(user.id)
  }
}
```

### Portal Entry Points

```typescript
// /app/seller-portal/layout.tsx
export default async function SellerPortalLayout({ children }) {
  const user = await requireAuthWithRole('seller')
  
  // Auto-create seller role if doesn't exist
  if (!user.roles.includes('seller')) {
    await createUserRole(user.id, 'seller')
  }
  
  // Set session context
  await setSessionContext(user.id, 'seller', 'seller_portal')
  
  return <SellerContext user={user}>{children}</SellerContext>
}

// Similar for investor-portal and admin-portal
```

---

## 4. Migration Strategy

### Phase 1: Database Migration
```sql
-- Step 1: Create new unified tables
-- (Schema from section 2)

-- Step 2: Migrate existing data
-- Migrate investor profiles
INSERT INTO user_profiles (user_id, email, full_name, phone)
SELECT user_id, 
       (SELECT email FROM auth.users WHERE id = user_id),
       full_name,
       phone
FROM investor_profiles
ON CONFLICT (user_id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

INSERT INTO user_roles (user_id, role)
SELECT user_id, 'investor' FROM investor_profiles;

INSERT INTO investor_data (user_id)
SELECT user_id FROM investor_profiles;

-- Similar for seller_profiles and admin_profiles

-- Step 3: Create backward compatibility views
CREATE VIEW investor_profiles_compat AS
SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.phone,
    up.created_at,
    up.updated_at
FROM user_profiles up
JOIN user_roles ur ON up.user_id = ur.user_id
WHERE ur.role = 'investor' AND ur.is_active = true;
```

### Phase 2: Application Code Updates
1. Update authentication middleware
2. Implement role context providers
3. Update API endpoints to use new auth
4. Migrate UI components to role-aware versions

### Phase 3: Cleanup
1. Remove old profile tables
2. Remove compatibility views
3. Update all references

---

## 5. Implementation Components

### 5.1 Authentication Context Provider

```typescript
// /lib/auth/auth-context.tsx
interface AuthContextValue {
  user: User | null
  activeRole: Role | null
  availableRoles: Role[]
  switchRole: (role: Role) => Promise<void>
  hasRole: (role: Role) => boolean
  loading: boolean
}

export const AuthProvider = ({ children, portal }) => {
  const [authState, setAuthState] = useState<AuthState>()
  
  useEffect(() => {
    // Initialize auth state based on portal
    initializeAuthForPortal(portal)
  }, [portal])
  
  const switchRole = async (newRole: Role) => {
    // Update session context
    await updateSessionRole(user.id, newRole)
    // Refresh auth state
    await refreshAuthState()
  }
  
  return (
    <AuthContext.Provider value={{ ...authState, switchRole }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### 5.2 Role-Based Route Protection

```typescript
// /lib/auth/route-protection.tsx
export function withRoleProtection(
  Component: React.ComponentType,
  requiredRole: Role
) {
  return function ProtectedComponent(props) {
    const { user, activeRole, hasRole } = useAuth()
    const router = useRouter()
    
    useEffect(() => {
      if (!user) {
        router.push('/login')
      } else if (!hasRole(requiredRole)) {
        // Offer role registration or redirect
        router.push(`/register-role/${requiredRole}`)
      }
    }, [user, activeRole])
    
    if (!user || !hasRole(requiredRole)) {
      return <LoadingSpinner />
    }
    
    return <Component {...props} />
  }
}
```

### 5.3 Role Registration Flow

```typescript
// /app/register-role/[role]/page.tsx
export default function RegisterRolePage({ params }) {
  const { role } = params
  const { user } = useAuth()
  
  const handleRoleRegistration = async (formData) => {
    // Create role for user
    await createUserRole(user.id, role, formData)
    
    // Redirect to appropriate portal
    router.push(`/${role}-portal`)
  }
  
  return (
    <RoleRegistrationForm
      role={role}
      user={user}
      onSubmit={handleRoleRegistration}
    />
  )
}
```

---

## 6. Security Considerations

### Row Level Security (RLS) Policies

```sql
-- User can read their own profile
CREATE POLICY "Users read own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- User can read their own roles
CREATE POLICY "Users read own roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Role-specific data access
CREATE POLICY "Users read own seller data"
ON seller_data FOR SELECT
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'seller' 
    AND is_active = true
  )
);

-- Admin access policies
CREATE POLICY "Admins read all profiles"
ON user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN admin_data ad ON ur.user_id = ad.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin' 
    AND ur.is_active = true
    AND ad.admin_level IN ('super_admin', 'admin')
  )
);
```

### Session Security
- JWT tokens include active role claim
- Session expiry based on portal sensitivity
- IP and user agent validation
- Rate limiting per role

---

## 7. Benefits & Trade-offs

### Benefits
✅ **User Flexibility**: Single email for all roles
✅ **Seamless Experience**: Automatic role switching
✅ **Data Consistency**: Unified profile management
✅ **Scalability**: Easy to add new roles
✅ **Backward Compatible**: Existing data preserved

### Trade-offs
⚠️ **Complexity**: More complex auth logic
⚠️ **Migration Effort**: Requires careful data migration
⚠️ **Testing**: More scenarios to test
⚠️ **Performance**: Additional role lookups

---

## 8. Implementation Timeline

### Week 1: Database Setup
- [ ] Create new schema
- [ ] Write migration scripts
- [ ] Test data migration

### Week 2: Core Authentication
- [ ] Update auth middleware
- [ ] Implement role context
- [ ] Create session management

### Week 3: Portal Integration
- [ ] Update seller portal
- [ ] Update investor portal
- [ ] Update admin portal

### Week 4: Testing & Deployment
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Production deployment

---

## 9. Testing Strategy

### Unit Tests
- Role assignment logic
- Permission verification
- Session management

### Integration Tests
- Portal access flows
- Role switching
- API authentication

### E2E Tests
- Complete user journeys
- Multi-role scenarios
- Edge cases

---

## 10. Monitoring & Analytics

### Key Metrics
- Role adoption rates
- Role switching frequency
- Authentication failures by role
- Session duration by portal

### Alerts
- Failed role assignments
- Suspicious role switching patterns
- Session anomalies

---

## Appendix A: API Endpoints

### Role Management APIs
```typescript
POST   /api/auth/roles/create
GET    /api/auth/roles/list
POST   /api/auth/roles/switch
DELETE /api/auth/roles/remove

POST   /api/auth/session/context
GET    /api/auth/session/active-role
```

### Profile Management APIs
```typescript
GET    /api/profile
PUT    /api/profile
GET    /api/profile/roles
PUT    /api/profile/seller-data
PUT    /api/profile/investor-data
```

---

## Appendix B: Configuration

### Environment Variables
```env
# Session configuration
SESSION_DURATION_SELLER=7200    # 2 hours
SESSION_DURATION_INVESTOR=3600  # 1 hour
SESSION_DURATION_ADMIN=1800     # 30 minutes

# Role configuration
AUTO_CREATE_ROLES=false
ALLOW_ROLE_SWITCHING=true
REQUIRE_ROLE_VERIFICATION=true
```
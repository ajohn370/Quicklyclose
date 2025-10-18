# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuicklyClose is an AI-powered real estate platform built with Next.js 14 that connects property sellers with investors through automated property valuations and streamlined cash offer processes. The application features comprehensive Model Context Protocol (MCP) integration for advanced AI capabilities.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run dev:clean    # Clean Next.js cache and start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci      # Run tests for CI (no watch, coverage enabled)
```

### Troubleshooting
```bash
npm run dev:clean    # Clean cache and restart (recommended for ChunkLoadError)
rm -rf .next && npm run dev  # Manual cleanup alternative
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Styling**: Tailwind CSS with Radix UI components (shadcn/ui pattern)
- **State Management**: Zustand + React Context for auth
- **Testing**: Jest with React Testing Library
- **MCP Integration**: Memory, Sequential Thinking, Filesystem, and Puppeteer servers

### Directory Structure
```
src/
├── app/                 # Next.js App Router (pages and API routes)
│   ├── api/            # API routes (all require authentication)
│   ├── dashboard/      # User dashboard
│   ├── seller-portal/  # Property submission interface
│   ├── investor-portal/# Property browsing and bidding
│   ├── comp-vision/    # AI property analysis
│   ├── mcp/           # MCP server management dashboard
│   └── marketing/      # Landing page (default redirect)
├── components/
│   ├── features/      # Feature-specific components
│   └── ui/           # Base UI components (shadcn/ui)
├── lib/              # Core utilities and configurations
├── types/            # TypeScript definitions
└── __tests__/        # Test files mirroring src structure
```

## Key Architectural Patterns

### Authentication & Security
- **All API routes require authentication** via custom middleware
- **Row Level Security (RLS)** policies at database level
- **Automatic profile creation** via database triggers on user signup
- **Role-based access control** (sellers vs investors)
- User authentication state managed via React Context (`AuthProvider`)

### Database Schema & Supabase Integration
- **investor_profiles**: User profiles for property investors
- **seller_profiles**: Contact information for property sellers  
- **properties**: Property listings with comprehensive metadata
- **leads**: Lead tracking and management system
- **comp_vision_analyses**: AI analysis results storage

Database features include comprehensive RLS policies, automatic timestamps via triggers, and CHECK constraints for data validation.

### API Response Format
All API routes return standardized JSON responses:
```json
{
  "success": true|false,
  "data": {...},
  "message": "Optional message"
}
```

### Authentication Pattern
API routes use consistent authentication checking:
```typescript
const user = await getAuthenticatedUser(request)
if (!user) {
  return createAuthErrorResponse('Authentication required')
}
```

### Component Architecture
- **UI Components**: Based on shadcn/ui with Radix UI primitives
- **Feature Components**: Business logic components (AuthModal, CompVision, InvestorPortal, SellerPortal, MCPDashboard)
- **Protected Routes**: Authentication-based route protection
- **Styling**: Tailwind CSS with CSS variables for theming

## MCP (Model Context Protocol) Integration

### Server Configuration
The application includes four pre-configured MCP servers in `mcp.json`:

1. **Memory Server**: Knowledge graph and entity management
   - Path: `./memory-store.json`
   - Usage: `mcp__memory__create_entities`, `mcp__memory__search_nodes`

2. **Sequential Thinking**: Chain-of-thought processing
   - Usage: Complex problem-solving and analysis

3. **Filesystem**: File operations and management
   - Root path: `./`
   - Usage: File reading, writing, and directory operations

4. **Puppeteer**: Web automation and scraping
   - Usage: Browser automation, screenshots, form filling

5. **Vercel**: Deployment and hosting management
   - Usage: Deploy applications, manage domains and configurations

### MCP Dashboard
Visit `/mcp` to monitor and manage MCP server status. The dashboard provides:
- Server status monitoring (running/stopped/error)
- Start/stop server controls
- Capability listings for each server
- Integration code examples

### MCP Client Implementation
MCP functionality is implemented in `src/lib/mcp-client.ts` with mock functions that demonstrate proper usage patterns. The client provides TypeScript interfaces and example implementations for all server interactions.

## Environment Configuration

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GITHUB_ACCESS_TOKEN=your_github_token  # For MCP GitHub integration
N8N_COMP_VISION_WEBHOOK_URL=your_n8n_webhook_url  # For N8N workflow automation
```

### Database Setup
The Supabase database must be initialized with the schema from the repository. All tables include RLS policies and automatic profile creation triggers.

## Key Development Considerations

### Code Patterns
- **Authentication First**: Always check user authentication before API operations
- **Type Safety**: Comprehensive TypeScript usage with database schema types
- **Error Handling**: Standardized error responses and user feedback
- **Component Composition**: Prefer composition over inheritance for React components
- **Security**: Never expose sensitive data in client-side code

### Testing Strategy
- **Unit Tests**: Component testing with React Testing Library
- **Integration Tests**: API route testing with authentication mocking
- **Coverage Reports**: HTML and LCOV coverage reports generated
- Tests mirror the source structure in `__tests__/` directory

### State Management
- **Server State**: React Query patterns for API data fetching
- **Authentication State**: React Context (`AuthProvider`) for user sessions
- **Client State**: Zustand for application-level state
- **Component State**: React useState for local component state

## Common Development Tasks

### Adding New API Routes
1. Create route in `src/app/api/[route]/route.ts`
2. Implement authentication middleware check
3. Add input validation and business logic
4. Return standardized JSON response
5. Add corresponding tests in `__tests__/api/`

### Adding New Components
1. Follow shadcn/ui patterns for UI components
2. Place feature-specific components in `components/features/`
3. Use TypeScript interfaces for props
4. Implement proper error boundaries and loading states
5. Add component tests with React Testing Library

### Working with MCP Servers
1. Use the MCP dashboard at `/mcp` to monitor server status
2. Reference `src/lib/mcp-client.ts` for integration patterns
3. Add new server configurations to `mcp.json`
4. Update environment variables as needed for server-specific config

### Database Changes
1. Update Supabase schema via SQL Editor
2. Ensure RLS policies are properly configured
3. Update TypeScript types to match schema changes
4. Test authentication and authorization flows
5. Update any affected API routes or components
# QuicklyClose - AI-Powered Real Estate Platform

QuicklyClose is a Next.js application that connects property sellers with investors through AI-powered property valuations and streamlined cash offer processes.

## 🚀 Features

- **AI Property Analysis**: Computer vision analysis of property photos
- **Investor Portal**: Browse and filter available properties
- **Seller Portal**: Submit properties and receive cash offers
- **Secure Authentication**: Supabase-powered user authentication
- **Real-time Data**: Live property listings and lead management

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **State Management**: Zustand
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## 🏗 Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd quickly-close-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Database Setup
Run the SQL schema in your Supabase SQL Editor:
```bash
# Copy contents of supabase-schema.sql to Supabase SQL Editor
```

### 5. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to see the application.

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Coverage
- API route testing with authentication
- Component testing with React Testing Library
- Integration tests for critical user flows

## 🏗 Build and Deploy

### Development Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   │   ├── leads/      # Lead management
│   │   ├── properties/ # Property listings
│   │   └── comp-vision/ # AI analysis
│   ├── dashboard/      # User dashboard
│   ├── marketing/      # Landing page
│   └── layout.tsx      # Root layout
├── components/         # Reusable components
│   ├── features/       # Feature-specific components
│   └── ui/            # UI components
├── lib/               # Utilities and configurations
│   ├── auth.ts        # Authentication helpers
│   ├── supabase.ts    # Supabase client
│   └── utils.ts       # General utilities
├── types/             # TypeScript type definitions
└── __tests__/         # Test files
```

## 🔐 Security Features

- **Authentication Required**: All API routes require user authentication
- **Row Level Security**: Database policies restrict data access
- **Input Validation**: Request validation and sanitization
- **CORS Protection**: Proper cross-origin request handling
- **Security Headers**: Next.js security configurations

## 🔌 API Endpoints

### Authentication Required
All API endpoints require valid authentication:

- `GET /api/leads` - Retrieve leads (investors only)
- `POST /api/leads` - Create new lead (sellers)
- `GET /api/properties` - Browse properties with filters
- `POST /api/comp-vision/analyze` - Analyze property images

### Response Format
```json
{
  "success": true|false,
  "data": {...},
  "message": "Optional message"
}
```

## 🌐 Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Environment Variables for Production
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:ci` - Run tests in CI mode
- `npm run type-check` - TypeScript type checking

## 🐛 Troubleshooting

### Common Issues

**ChunkLoadError**: Clear `.next` folder and restart dev server
```bash
rm -rf .next
npm run dev
```

**Authentication Issues**: Verify Supabase environment variables and RLS policies

**Build Failures**: Run type checking and fix TypeScript errors
```bash
npm run type-check
```

## 📞 Support

For issues and questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Include error logs and reproduction steps

## 📄 License

This project is proprietary software. All rights reserved.

---

*Built with ❤️ using Next.js and Supabase*
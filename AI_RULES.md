# AI Development Rules for QuicklyClose

This document provides a clear set of rules for the AI assistant to follow when developing and modifying the QuicklyClose application. The goal is to maintain consistency, readability, and best practices across the codebase.

---

## 1. Core Technology Stack

The application is built on a modern, serverless-first stack. Here are the key technologies:

-   **Framework**: Next.js 14 (using the App Router).
-   **Language**: TypeScript is used for all code to ensure type safety.
-   **Backend & Database**: Supabase handles authentication, database (PostgreSQL), and storage.
-   **Styling**: Tailwind CSS is used exclusively for styling.
-   **UI Components**: We use **shadcn/ui**, which provides accessible and unstyled components built on top of Radix UI. The components are located in `src/components/ui`.
-   **State Management**: Zustand is used for simple, global client-side state. React Query (`@tanstack/react-query`) should be used for managing server state, caching, and data fetching.
-   **Forms**: React Hook Form is the standard for all form management and validation.
-   **Icons**: `lucide-react` is the designated library for all icons.
-   **API Layer**: Backend logic is built using Next.js API Route Handlers within the `src/app/api/` directory.

---

## 2. Library Usage Guidelines

To ensure consistency, please adhere to the following rules for using specific libraries:

### **Styling & UI**

-   **Styling**: **ALWAYS** use Tailwind CSS utility classes for styling. Do not write custom `.css` files. Use the `cn` utility from `src/lib/utils.ts` to conditionally apply classes.
-   **UI Primitives**: **ALWAYS** use the pre-built shadcn/ui components from `src/components/ui` (e.g., `Button`, `Card`, `Input`). Do not install or use other component libraries like Material UI or Ant Design.
-   **Icons**: **ALWAYS** import icons from `lucide-react`. Do not use SVGs directly or install other icon packs.

### **State & Data Management**

-   **Client-Side State**: For simple global state (e.g., UI state, theme), use the existing Zustand store located at `src/lib/store.ts`. For local component state, use React's `useState` and `useReducer`.
-   **Server-Side State**: For fetching, caching, and mutating server data, **ALWAYS** use React Query (`@tanstack/react-query`). Do not use `useEffect` with `fetch` for data fetching.
-   **Forms**: For any form that requires validation or manages more than one input, **ALWAYS** use `react-hook-form`.

### **Backend & Authentication**

-   **Authentication**: All authentication logic **MUST** use the Supabase client and the helpers provided in `src/lib/auth.ts` and `src/lib/auth-context.tsx`.
-   **Database Interaction**: All database queries **MUST** go through the Supabase client defined in `src/lib/supabase.ts`. Do not connect to the database directly.
-   **API Endpoints**: Create all new backend endpoints as Next.js API Route Handlers inside the `src/app/api/` directory.

### **Code Structure & Types**

-   **Component Structure**: Create new, feature-specific components inside `src/components/features/`. Keep components small and focused on a single responsibility.
-   **Type Definitions**: Define shared, reusable TypeScript types in `src/types/index.ts`. Database-specific types should be defined in `src/lib/supabase.ts` to keep them close to the client.
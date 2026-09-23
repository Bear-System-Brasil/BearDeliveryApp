# BearDelivery App

> A modern, full-featured food delivery platform built with Next.js 15 and React 19

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

## Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Development Guide](#-development-guide)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## Overview

BearDelivery is a comprehensive food delivery platform that connects customers with restaurants. The application provides a seamless experience for browsing restaurants, managing orders, and tracking deliveries in real-time.

**Key Roles:**
- **Customers** - Browse restaurants, place orders, track deliveries
- **Restaurant Admins** - Manage menus, process orders, update business info
- **Platform Admins** - Oversee the entire platform (future)

## Features

### Customer Features
- Advanced restaurant search with filters
- Real-time shopping cart with backend sync
- Multiple delivery addresses management
- Multiple payment methods
- Real-time order tracking
- Restaurant favorites
- Profile management with photo upload

### Restaurant Features
- Complete menu management
- Order management dashboard
- Business profile customization
- Logo and cover photo uploads
- Basic analytics (orders, revenue)

### Technical Features
- Modern, responsive UI with glass-morphism design
- Dark mode support (infrastructure ready)
- Optimistic UI updates
- Real-time data synchronization
- Mobile-first approach
- Progressive rendering for performance
- Secure authentication with JWT
- Efficient state management

## Tech Stack

### Core
- **Framework:** Next.js 15.1.6 (App Router)
- **React:** 19.2.0
- **TypeScript:** 5.x
- **Styling:** Tailwind CSS 4.1.17

### State Management
- **Zustand** 5.0.8 - Global state with persistence
- **TanStack Query** 5.90.7 - Server state & caching

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon system
- **Sonner** - Toast notifications
- **React Hook Form** - Form handling

### Utilities
- **date-fns** - Date manipulation
- **zod** - Schema validation
- **clsx/tailwind-merge** - CSS utilities

### Development
- **ESLint** - Code linting
- **TypeScript** - Type safety
- **Vercel Analytics** - Performance monitoring

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn or pnpm
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd like-delivery-app
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:
```env
NEXT_PUBLIC_API_URL=https://bearsystem.tech
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
like-delivery-app/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx             # Home page
│   │   ├── layout.tsx           # Root layout
│   │   ├── cart/                # Cart page
│   │   ├── checkout/            # Checkout flow
│   │   ├── orders/              # Order history
│   │   ├── profile/             # User profile
│   │   ├── restaurants/         # Restaurant listing
│   │   ├── restaurant/[id]/     # Restaurant detail
│   │   ├── menu-management/     # Admin: Menu management
│   │   ├── order-management/    # Admin: Order management
│   │   └── company-profile/     # Admin: Business profile
│   │
│   ├── components/              # React components
│   │   ├── ui/                  # Base UI components (shadcn/ui)
│   │   ├── auth-modal/          # Authentication modal
│   │   ├── footer/              # Footer component
│   │   ├── main-header/         # Header component
│   │   ├── restaurant-card/     # Restaurant card
│   │   └── ...                  # Other feature components
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-auth.ts         # Authentication hook
│   │   ├── use-cart-actions.ts # Cart management
│   │   ├── use-restaurants.ts  # Restaurant data
│   │   └── ...                 # Other hooks
│   │
│   ├── stores/                  # Zustand stores
│   │   ├── auth-store.ts       # Auth state
│   │   ├── cart-store.ts       # Cart state
│   │   ├── favorites-store.ts  # Favorites
│   │   └── preferences-store.ts # User preferences
│   │
│   ├── services/               # API services
│   │   └── api.ts             # Centralized API client
│   │
│   ├── utils/                  # Utility functions
│   │   ├── storage-manager.ts  # Storage abstraction
│   │   ├── format-currency.ts  # Currency formatting
│   │   └── ...                # Other utilities
│   │
│   ├── contexts/              # React contexts
│   │   └── auth-provider.tsx  # Auth context wrapper
│   │
│   ├── types/                 # TypeScript types
│   │   └── index.ts          # Type definitions
│   │
│   ├── constants/            # Constants
│   │   └── restaurant-categories.ts
│   │
│   └── lib/                  # Library configurations
│       └── utils.ts         # Shared utilities
│
├── public/                   # Static assets
├── DOCS/                     # Documentation
└── like-delivery-backend-dev/ # Backend (separate project)
```

## Architecture

### Design Patterns

#### 1. **Component Structure**
```
Feature Component (Smart)
  ├── UI Components (Presentational)
  ├── Custom Hooks (Business Logic)
  └── API Services (Data Layer)
```

#### 2. **State Management Strategy**

**Zustand Stores** (Client State)
- `auth-store.ts` - Authentication state (user, token)
- `cart-store.ts` - Shopping cart (orderId for persistence)
- `favorites-store.ts` - Favorite restaurants
- `preferences-store.ts` - User preferences (theme, language, notifications)

**TanStack Query** (Server State)
- Restaurants data with caching
- Products/menu items
- Orders and deliveries
- User profile and addresses

```typescript
// Example: Zustand for client state
const { user, isAuthenticated } = useAuthStore()

// TanStack Query for server state
const { data: restaurants, isLoading } = useRestaurants()
```

#### 3. **Data Flow**

```
User Action
    ↓
Component Handler
    ↓
Custom Hook (Business Logic)
    ↓
├─→ Zustand Store (Client State)
└─→ API Service (Server State)
    ↓
TanStack Query (Caching & Sync)
    ↓
UI Update (Optimistic or Real)
```

#### 4. **Storage Management**

Centralized storage via `storage-manager.ts`:
- **localStorage** - Persistent data (auth, preferences, favorites)
- **sessionStorage** - Temporary data (navigation context)
- **Zustand persist** - Automatic sync with storage

```typescript
import { storageManager, STORAGE_KEYS } from '@/utils/storage-manager'

// Use standardized keys
storageManager.local.set(STORAGE_KEYS.AUTH, data)
```

### API Integration

**Centralized API Client** (`services/api.ts`)
- Single source for all API calls
- Automatic error handling
- Token management
- Type-safe endpoints

```typescript
import { apiService } from '@/services/api'

// Usage
const response = await apiService.restaurants.getById(id)
const products = await apiService.products.getByCompany(companyId)
```

**Backend URL:** `https://bearsystem.tech`

**Key Endpoints:**
- `/auth/*` - Authentication
- `/company/*` - Restaurants/Companies
- `/product/*` - Menu items
- `/order/*` - Orders (Redis-based)
- `/delivery/*` - Deliveries
- `/address/*` - User addresses
- `/upload/*` - File uploads (S3)

### Authentication Flow

1. User submits login form
2. API returns JWT token + user data
3. Data saved to both:
   - Zustand store (`auth-store.ts`)
   - localStorage (legacy compatibility)
4. Token included in all subsequent requests
5. Protected routes check authentication via `useAuthStore`

```typescript
// Protected route example
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/" />
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />
  }
  
  return children
}
```

## Development Guide

### Code Standards

#### TypeScript
- Always use TypeScript (no `any` types)
- Define interfaces for all data structures
- Use type inference when possible
- Export types from `@/types`

#### Components
- Use functional components with hooks
- Keep components focused (single responsibility)
- Extract business logic to custom hooks
- Use composition over inheritance

#### Naming Conventions
```typescript
// Components - PascalCase
export default function RestaurantCard() {}

// Files - kebab-case
restaurant-card.tsx
use-cart-actions.ts

// Hooks - camelCase with 'use' prefix
function useRestaurants() {}

// Constants - UPPER_SNAKE_CASE
export const API_BASE_URL = ''
```

#### File Organization
```
component-name/
  ├── index.tsx           # Main component
  ├── component-name.test.tsx  # Tests (future)
  └── types.ts           # Component-specific types
```

### Custom Hooks Pattern

Custom hooks encapsulate business logic and make components clean:

```typescript
// Good - Logic in custom hook
function useRestaurantActions() {
  const router = useRouter()
  const { addItem } = useCartStore()
  
  const handleRestaurantClick = (id: string) => {
    router.push(`/restaurant/${id}`)
  }
  
  return { handleRestaurantClick }
}

// Component stays clean
function RestaurantCard({ restaurant }) {
  const { handleRestaurantClick } = useRestaurantActions()
  
  return (
    <div onClick={() => handleRestaurantClick(restaurant.id)}>
      {restaurant.name}
    </div>
  )
}
```

### State Management Best Practices

#### When to use Zustand
- Client-side state that needs persistence
- UI state shared across multiple pages
- User preferences and settings

#### When to use TanStack Query
- Data from API endpoints
- Data that needs caching
- Data with complex loading/error states

```typescript
// Good - Server state with TanStack Query
const { data: restaurants } = useQuery({
  queryKey: ['restaurants'],
  queryFn: () => apiService.restaurants.getAll(),
  staleTime: 10 * 60 * 1000, // 10 minutes
})

// Good - Client state with Zustand
const { favorites, toggleFavorite } = useFavoritesStore()
```

### Performance Optimizations

#### 1. Lazy Loading
```typescript
// Dynamic imports for heavy components
const MenuManagement = dynamic(() => import('@/app/menu-management'))
```

#### 2. Memoization
```typescript
// Expensive calculations
const sortedRestaurants = useMemo(() => {
  return restaurants.sort((a, b) => b.rating - a.rating)
}, [restaurants])
```

#### 3. Progressive Rendering
```typescript
// Show content in batches (implemented in home page)
const [visibleCount, setVisibleCount] = useState(3)

useEffect(() => {
  if (visibleCount < restaurants.length) {
    setTimeout(() => setVisibleCount(prev => prev + 3), 100)
  }
}, [visibleCount, restaurants.length])
```

### Styling with Tailwind

#### Utility-First Approach
```tsx
// Good - Utility classes
<button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg">
  Order Now
</button>
```

#### Component Variants
```tsx
// Using class-variance-authority
const buttonVariants = cva(
  "px-4 py-2 rounded-lg transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 hover:bg-brand-600",
        secondary: "bg-gray-200 hover:bg-gray-300",
      }
    }
  }
)
```

#### Responsive Design
```tsx
// Mobile-first approach
<div className="w-full sm:w-1/2 lg:w-1/3">
  // Small screens: full width
  // Medium screens: half width  
  // Large screens: third width
</div>
```

### Common Patterns

#### Optimistic Updates
```typescript
const mutation = useMutation({
  mutationFn: apiService.cart.addItem,
  onMutate: async (newItem) => {
    // Optimistically add to UI
    setItems(prev => [...prev, newItem])
  },
  onError: (error, newItem, context) => {
    // Rollback on error
    setItems(context.previousItems)
  },
})
```

#### Error Handling
```typescript
try {
  const response = await apiService.orders.create(orderData)
  if (response.success) {
    toast.success('Order placed successfully!')
  } else {
    toast.error(response.message)
  }
} catch (error) {
  toast.error('Connection error. Please try again.')
}
```

## Deployment

### Vercel (Recommended)

1. **Push to Git**
```bash
git push origin main
```

2. **Import Project in Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your repository
- Configure environment variables
- Deploy

### Environment Variables

Set these in your deployment platform:
```env
NEXT_PUBLIC_API_URL=https://bearsystem.tech
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Build Optimization

The app is optimized for production:
- Static page generation where possible
- Image optimization via Next.js
- Code splitting and lazy loading
- Bundle size optimization

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors
- [ ] API endpoints are accessible
- [ ] Images and assets load correctly
- [ ] Authentication flow works
- [ ] Cart functionality tested
- [ ] Order placement tested

## Contributing

### Development Workflow

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
- Follow the code standards
- Keep commits atomic and descriptive
- Test your changes locally

3. **Commit with clear messages**
```bash
git commit -m "feat: add restaurant filtering by cuisine"
```

4. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

### Commit Message Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
perf: Performance improvements
test: Adding tests
chore: Build process or auxiliary tool changes
```

### Code Review Guidelines

- Ensure code follows existing patterns
- Check for TypeScript errors
- Verify responsive design
- Test on multiple browsers
- Check for performance implications

## Additional Resources

### Documentation
- [DOCS/](./DOCS/) - Detailed documentation files
- [STORAGE_STANDARDIZATION.md](./DOCS/STORAGE_STANDARDIZATION.md) - Storage patterns
- [TEAM_HANDOFF.md](./TEAM_HANDOFF.md) - Project handoff notes

### Backend
- Backend repository: `like-delivery-backend-dev/`
- API Documentation: Check backend README
- Endpoints: `https://bearsystem.tech`

### External Links
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)

## Roadmap & Next Steps

### Short Term (MVP Complete)
- Customer flow (browse, cart, checkout, orders)
- Restaurant admin (menu, orders, profile)
- Authentication and authorization
- Real-time order tracking
- Multiple addresses and payments
- Image uploads to S3

### Medium Term (Enhancements)
- [ ] Implement comprehensive testing suite
- [ ] Add real-time notifications (WebSockets)
- [ ] Implement actual ratings and reviews
- [ ] Add coupon and promotion system
- [ ] Delivery time calculation based on location
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (i18n)
- [ ] Platform admin panel

### Long Term (Scale)
- [ ] Native mobile apps (React Native)
- [ ] Delivery driver app and tracking
- [ ] Advanced search with filters (price, rating, cuisine)
- [ ] Restaurant recommendations (ML)
- [ ] Loyalty program
- [ ] Integration with payment gateways
- [ ] Push notifications

## License

This project is private and proprietary.

---

For questions or support, check the documentation in `/DOCS` or reach out to the team.

.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Immobot is a German real estate search application. Users register, set up property search filters (location, price, property type), and receive matching listings. The app uses a subscription-based payment model via Stripe.

## Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run lint     # ESLint check
npm run preview  # Preview production build
```

## Tech Stack

- **Frontend**: React 19, React Router 7, Tailwind CSS 4, Framer Motion
- **Build**: Vite 7 with SWC for React
- **Backend**: Firebase (Auth, Firestore, Cloud Functions v2)
- **Payments**: Stripe subscriptions
- **Region**: Firebase Functions deployed to `europe-west1`

## Architecture

### Routing Structure (src/App.jsx)

Three route groups with different protection levels:
- **Public** (`PublicLayout`): Login, multi-step registration flow
- **User** (`UserLayout` + `ProtectedRoute`): Dashboard, filters, results, profile
- **Admin** (`AdminLayout` + `AdminRoute`): User management, click analytics, offers

### Authentication Flow

`AuthContext` wraps the app and provides:
- `user`: Firebase Auth user object
- `role`: User role from Firestore (`users/{uid}.role`)
- `ready`: Boolean indicating auth state is resolved
- `logout`: Sign out function

Route guards:
- `ProtectedRoute`: Requires authenticated user
- `AdminRoute`: Requires `role === "admin"`
- `PublicOnlyRoute`: Redirects authenticated users away from registration

### Payment System

`RequirePayment` component wraps protected content and checks payment status via `usePaymentStatus` hook. Possible states:
- `isPaid`: Active subscription
- `isPending`: Checkout in progress
- `needsAction`: Payment failed
- `isCancelled`: Subscription cancelled
- `isFree`: No subscription

Stripe integration uses Firebase Cloud Functions:
- `createCheckoutSession`: Initiates Stripe checkout
- `createCustomerPortal`: Opens Stripe billing portal
- `handleStripeWebhook`: Processes Stripe events
- `cancelSubscriptionAtPeriodEnd`, `reactivateSubscription`: Subscription management

### Registration Flow

Multi-step wizard at `/register/step1` through `/register/step5`:
1. Property type selection (Kauf/Miete, object classes)
2. Location with map coordinate picker
3. Price and space range filters
4. Optional advanced filters
5. Optional extras

Filter state persisted to localStorage via `src/pages/public/register/storage/index.js` with versioning.

### User Filters Context

Two filter systems exist:
1. **Registration filters**: `src/pages/public/register/storage/` - localStorage-based for registration wizard
2. **User filters**: `src/components/filters/context/FiltersContext.jsx` - Context-based with auto-save for logged-in users

### Firebase Configuration

- Config loaded from `VITE_FIREBASE_*` environment variables
- Functions region: `europe-west1`
- Firestore collections: `users`, `offerRedirects`, `clickEvents`

### Path Aliases

Configured in `vite.config.js`:
- `@` → `./src`
- `@/firebase` → `./src/firebase.js`

## Cloud Functions (functions/index.js)

Functions use Firebase Functions v2 with `defineString` and `defineSecret` for configuration:
- Stripe functions: checkout, portal, subscription management, webhooks
- Email verification: `sendVerifyEmail`, `verifyEmail`
- Analytics: `trackOfferClick` for click tracking with redirect

## ESLint Configuration

Uses flat config (`eslint.config.js`) with:
- React Hooks plugin (recommended)
- React Refresh plugin (Vite)
- `no-unused-vars` ignores variables starting with uppercase or underscore

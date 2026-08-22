# Metric Lab: Complete Implementation Plan

## 1. Architectural Foundation 🏛️

Before we write a single line of code, we need a SOLID foundation. We will use **Hexagonal Architecture (Ports and Adapters)** for the backend and **Container-Presentational Pattern** combined with **Atomic Design** for the frontend.

### 1.1 Backend (Node.js Serverless + Supabase)
We will use a serverless architecture deployed on the Vercel free tier, backed by Supabase (PostgreSQL) free tier.
*   **API Layer:** Vercel Serverless Functions (`api/` directory using `@vercel/node` and TypeScript). This provides instant deployments and auto-scaling with zero maintenance.
*   **Database Layer:** Supabase PostgreSQL. We interact with it using `@supabase/supabase-js`.
*   **Authentication:** Supabase Auth handles secure user registration and JWT generation.

### 1.2 Frontend (React Native + Expo)
The `metric-lab-mobile` directory will be structured for maintainability:

*   **State Management:** React Query (TanStack Query) for remote server state (fetching routines, syncing logs) and Zustand/Context for local ephemeral state.
*   **UI Components:** Built using Atomic Design (Atoms: Buttons, Typography; Molecules: ExerciseCard; Organisms: WorkoutTracker).
*   **Container/Presentational:** Screens (Containers) will handle data fetching and pass it down to pure UI components (Presentational).

---

## 2. Environments & Deployment (DevOps) ☁️

To ensure seamless delivery on free tiers:

### 2.1 Environments
*   **Development (`dev`):** Local React Native Expo server hitting a local or staging Supabase project. You can run Vercel dev server locally using `vercel dev`.
*   **Production (`prod`):** Vercel handles the API deployment directly from the GitHub repository. Supabase handles the production database.

### 2.2 Infrastructure
*   **Supabase (Free Tier):** Provides up to 500MB of PostgreSQL storage, generous API bandwidth, and built-in Row Level Security (RLS).
*   **Vercel (Free Tier):** Generous execution limits for Serverless Functions mapping to our `api/*` endpoints.

---

## 3. Domain Model & Database Schema (PostgreSQL) 🗄️

We need a structured way to track programs (like Push/Pull) and the actual executed sessions.

1.  **`users`**: `id`, `email`, `password_hash`, `created_at`
2.  **`routines`**: `id`, `user_id`, `name` (e.g., "Push", "Pull"), `description`
3.  **`exercises`**: `id`, `name`, `muscle_group`, `base_weight`
4.  **`routine_exercises`**: `routine_id`, `exercise_id`, `target_sets`, `target_reps`
5.  **`workout_sessions`**: `id`, `user_id`, `routine_id`, `started_at`, `ended_at`
6.  **`set_logs`**: `id`, `workout_session_id`, `exercise_id`, `weight`, `reps`, `is_completed`

---

## 4. Implementation Phases 🚀

### Phase 1: Serverless Backend Foundation (Vercel + Supabase)
1.  Set up Supabase project and execute `supabase-schema.sql` to build the database.
2.  Initialize Vercel Serverless project in `metric-lab-api` with `@vercel/node` and TypeScript.
3.  Implement Supabase client utility.
4.  Implement Core API Endpoints (e.g., `api/auth`, `api/workouts/sync`).
5.  Deploy to Vercel and verify connection.

### Phase 2: Frontend Wiring (React Native)
1.  Refactor `metric-lab-mobile` to enforce Atomic Design and Container-Presentational separation.
2.  Set up API client (Axios) and React Query connected to our local Docker backend.
3.  Implement Authentication Flow (Login/Register screens).
4.  Build the **Config / Programs** screens to view "Push/Pull" routines.

### Phase 3: The Workout Tracker (The Core)
1.  Build the **TrainScreen** logic: Starting a session, tracking active sets, adjusting weights.
2.  Sync session data with the Spring Boot API upon completion.
3.  Offline support (optional but recommended): Save logs in SQLite locally and sync when online.

### Phase 4: Production Readiness & Analytics
1.  Build the **DataScreen**: Fetch historical data, calculate 1RM progressions.
2.  Finalize `prod` Docker setup (multi-stage builds, environment variable injection for production DB).

### Phase 5: Production Delivery & Observability (The Professional Polish)
1.  **Mobile Builds (CI/CD):** Set up Expo EAS (Expo Application Services) to compile standalone iOS (IPA) and Android (AAB/APK) binaries. Configure GitHub Actions for automated builds.
2.  **Crash Reporting:** Integrate Sentry (or Firebase Crashlytics) to catch frontend exceptions and React Native bridge crashes in production.
3.  **Automated Testing:** Implement Jest and React Native Testing Library for critical UI state, and Maestro/Detox for End-to-End (E2E) testing of the workout flow.

# MarketIntelli UI Review & Recommendations

## Executive Summary

MarketIntelli is a Solar Market Intelligence Platform built with React 19, TypeScript, Vite, React Router v7, and TanStack React Query. The project has a solid architectural foundation — clean separation of concerns across pages, features, hooks, API modules, and types — but the **UI layer is in an early scaffold state**. Most pages render static placeholder text, there are **zero CSS files** despite class names being referenced throughout, and several installed libraries (Recharts, Leaflet) remain unused.

Below is a structured review organized by severity.

---

## Critical Issues

### 1. No Stylesheet Exists

**Files affected:** Every component

The entire application references CSS class names (`.app-layout`, `.metrics-grid`, `.metric-card`, `.loading-spinner`, etc.) but **no CSS, SCSS, or styled-component files exist anywhere in the project**. The UI renders as unstyled, raw HTML.

**Recommendation:** Create a base stylesheet (`src/index.css` or adopt a utility framework like Tailwind CSS) and import it in `main.tsx`. At minimum, define styles for:
- Layout structure (`.app-layout`, `.app-header`, `.app-nav`, `.app-main`)
- Metric cards and grids
- Tables (financial insights)
- Loading and error states
- Navigation active states

### 2. Incomplete Error Handling on Dashboard

**File:** `src/pages/DashboardPage.tsx:15-22`

The dashboard checks `overview.isError` but silently ignores `insights.isError`. If the financial insights API call fails, no feedback is shown to the user.

**Recommendation:** Add an error check for `insights.isError` alongside the existing one, or use a combined error boundary approach.

### 3. No 404 / Catch-All Route

**File:** `src/App.tsx`

There is no fallback route for unmatched URLs. Users navigating to an invalid path see a blank page.

**Recommendation:** Add a `<Route path="*" element={<NotFoundPage />} />` catch-all route inside the layout.

---

## Major Gaps

### 4. Three of Five Pages Are Static Placeholders

**Files:**
- `src/pages/GeoAnalyticsPage.tsx` — No data fetching, no map rendering, purely descriptive text
- `src/pages/PolicyPage.tsx` — No data fetching, no policy listing, purely descriptive text
- `src/pages/ProjectsPage.tsx` — Fetches projects data but never renders a list or table
- `src/pages/AlertsPage.tsx` — Fetches alerts data but never renders individual alerts

These pages have hooks and API modules ready (`useAlerts`, `useProjects`, policy/geoAnalytics APIs) but the data is not wired to any visual components.

**Recommendation:** Build out data display components for each page:
- **ProjectsPage:** A filterable/sortable table of `SolarProject` records
- **AlertsPage:** An alert list with severity badges and timestamps
- **PolicyPage:** Wire up `usePolicies`, `useTariffs`, `useSubsidies` hooks (they need to be created) and render data tables/cards
- **GeoAnalyticsPage:** Integrate the already-installed `react-leaflet` to render solar potential zones, grid infrastructure, and disaster risk overlays on an interactive map

### 5. Installed Libraries Not Used

**File:** `package.json`

| Library | Status |
|---------|--------|
| `recharts` (2.15.0) | Installed but unused — no chart components exist |
| `leaflet` + `react-leaflet` | Installed but unused — GeoAnalyticsPage has a placeholder comment |
| `date-fns` (4.1.0) | Installed but unused — no date formatting in any component |

**Recommendation:** Either integrate these libraries into the UI (charts for dashboard metrics, maps for geo analytics, date formatting for timestamps) or remove them to reduce bundle size. Given the project's intent, integrating them is the right path.

### 6. No Authentication UI

**File:** `src/api/client.ts`

The API client reads a JWT token from `localStorage` and handles 401 responses, but there is no login page, registration page, or auth context/provider in the frontend. Users have no way to authenticate through the UI.

**Recommendation:** Add:
- A `LoginPage` component with a form that posts credentials and stores the JWT
- An `AuthProvider` context that manages auth state
- Protected route wrappers that redirect unauthenticated users to login
- A logout button in the header

---

## UX & Design Recommendations

### 7. Navigation Needs Visual Hierarchy and Icons

**File:** `src/components/layout/MainLayout.tsx`

The navigation is a plain `<ul>` of text links. For a data-heavy intelligence platform, the nav should communicate the purpose of each section at a glance.

**Recommendation:**
- Add icons next to each nav item (e.g., chart icon for Dashboard, map pin for Geo Analytics, folder for Projects, shield for Policy, bell for Alerts)
- Consider a sidebar navigation pattern instead of a top bar — sidebar navs work better for dense analytical applications
- Show an active indicator (underline, background highlight, or left border) on the current route

### 8. Dashboard Lacks Visual Richness

**Files:** `src/features/dashboard/MarketOverviewPanel.tsx`, `FinancialInsightsPanel.tsx`

The dashboard is the landing page but only shows three raw metric numbers and a plain HTML table. For a market intelligence platform, the dashboard should be the most visually compelling page.

**Recommendation:**
- Use **Recharts** (already installed) to add:
  - A bar/area chart for regional capacity distribution
  - A trend line for capacity growth over time
  - A pie/donut chart for project status distribution
- Add KPI cards with trend indicators (up/down arrows, percentage changes)
- Add a "recent alerts" summary widget
- Add a mini-map showing project locations

### 9. No Responsive Design

**Files:** All components

There are no media queries, no responsive utilities, and no CSS framework. The application will not adapt to tablet or mobile viewports.

**Recommendation:**
- If adopting Tailwind CSS, responsive design comes built-in via breakpoint prefixes
- If writing custom CSS, add a responsive grid system and breakpoint media queries
- At minimum, ensure the navigation collapses into a hamburger menu on mobile and tables become scrollable

### 10. No Loading Skeletons

**Files:** `src/components/common/LoadingSpinner.tsx`

The loading state is a single spinner that replaces the entire page. This causes layout shift and feels abrupt.

**Recommendation:** Replace full-page spinners with skeleton loaders that match the shape of the content being loaded. This provides better perceived performance and avoids layout shift.

### 11. Tables Need Enhancement

**File:** `src/features/dashboard/FinancialInsightsPanel.tsx`

The financial insights table is a bare HTML `<table>` with no sorting, filtering, pagination, or row hover effects.

**Recommendation:**
- Add column sorting (clickable headers)
- Add pagination or virtualization for large datasets
- Add row hover highlighting
- Consider using a lightweight table library like `@tanstack/react-table`

---

## Architecture & Code Quality

### 12. Missing React Error Boundary

No `ErrorBoundary` component exists. An unhandled runtime error in any component will crash the entire app with a white screen.

**Recommendation:** Add a top-level `ErrorBoundary` component in `App.tsx` that catches render errors and shows a recovery UI.

### 13. No Lazy Loading / Code Splitting

**File:** `src/App.tsx`

All five page components are eagerly imported. As the app grows, this will increase the initial bundle size.

**Recommendation:** Use `React.lazy()` and `<Suspense>` for route-level code splitting:
```tsx
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
```

### 14. Accessibility Gaps

Across all components:
- No `aria-label` attributes on interactive elements
- No `role` attributes on custom widgets
- No keyboard navigation support beyond browser defaults
- No skip-to-content link
- No focus management on route transitions

**Recommendation:** Audit against WCAG 2.1 AA. Start with:
- Adding `aria-label` to the nav, buttons, and form controls
- Ensuring color contrast ratios meet AA standards (once styles exist)
- Adding a skip-to-content link in the layout

### 15. No Environment-Specific Configuration

The API base URL is hardcoded to `/api/v1` in the client. There is no `.env` configuration for switching between development, staging, and production API URLs.

**Recommendation:** Use Vite's `import.meta.env.VITE_API_BASE_URL` pattern with `.env` files for environment-specific configuration.

---

## Suggested Priority Order

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Add a stylesheet / adopt a CSS framework | Foundation for everything else |
| P0 | Fix dashboard error handling for `insights.isError` | One-line fix |
| P0 | Add a 404 catch-all route | Small component + one route |
| P1 | Build out ProjectsPage and AlertsPage data rendering | Medium — components + tables |
| P1 | Integrate Recharts into the dashboard | Medium — chart components |
| P1 | Add authentication UI (login page, auth context) | Medium — new page + context |
| P1 | Add React Error Boundary | Small component |
| P2 | Integrate Leaflet map into GeoAnalyticsPage | Medium-Large — map layers |
| P2 | Wire up PolicyPage with data hooks | Medium — hooks + display |
| P2 | Add responsive design | Medium — CSS work |
| P2 | Implement skeleton loaders | Small per component |
| P3 | Add lazy loading / code splitting | Small refactor |
| P3 | Accessibility audit and fixes | Ongoing |
| P3 | Environment configuration via `.env` | Small |

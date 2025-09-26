# Gym Management System Repository Overview

## Tech Stack
- **Frontend**: React with Vite and TailwindCSS
- **UI Components**: Shadcn-based component library with custom wrappers in `src/components`
- **State & Data**: React Context (`AuthContext`, etc.) and REST API integration via helper hooks
- **Routing**: React Router DOM
- **Build & Deployment**: Vite build targeting Netlify

## Key Directories
- **src/pages**: Top-level page components (e.g., `Dashboard.jsx`, `Profile.jsx`)
- **src/components**: Reusable UI components and layout modules
- **src/contexts**: React Context providers (authentication, theme, etc.)
- **src/utils**: Helper utilities (ID parsing, formatting, API helpers)
- **src/lib**: Miscellaneous libraries or configuration helpers

## Patterns & Conventions
1. **Absolute Imports**: Uses Vite aliases (`@/components`, `@/contexts`, etc.).
2. **UI Components**: Prefer Shadcn variants (`Card`, `Button`, `Badge`, etc.).
3. **Auth Requests**: Use `authFetch` from `useAuth()` for authenticated API calls.
4. **Notifications**: Use `toast` from `react-hot-toast` for user feedback.
5. **Styling**: Tailwind utility classes, occasionally complemented by component props.

## Testing & Tooling
- **ESLint & Prettier**: Enforced code style (check project config before modifying).
- **Unit Tests**: Limited coverage—add tests when introducing complex logic.

## Deployment Notes
- **Netlify**: Vite build output (`dist`) deployed via Netlify. Avoid browser-only APIs during SSR if using Netlify Functions.

## Additional Tips
- Separate complex page logic into smaller components for readability.
- Guard authenticated routes and context consumers carefully.
- Handle loading and error states for API requests with `toast` feedback.
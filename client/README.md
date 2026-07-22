# client

Vite + React 18 + TypeScript frontend for the auth/dashboard app, replacing the
legacy AngularJS 1.8 app that used to live in `public/`.

## Develop

```
cd client
npm install
npm run dev
```

The dev server proxies `/api/*` requests to the Express backend at
`http://localhost:3000` (see `vite.config.ts`), so run the backend
(`cd ../server && npm start`) alongside it.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build to `dist/`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test` — Vitest component tests

## Structure

- `src/api/types.ts` — types mirroring the backend's JSON response shapes
- `src/api/client.ts` — the only module allowed to call `fetch`; typed wrappers
  (`postLogin`, `postLogout`, `getMe`, `getDashboard`) plus `ApiError`
- `src/auth/AuthContext.tsx` — session state, rehydrated via `getMe()` on mount
- `src/routes/ProtectedRoute.tsx` — redirects to `/login` when unauthenticated
- `src/pages/LoginPage.tsx`, `src/pages/DashboardPage.tsx` — the two routes

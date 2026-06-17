# Dogs Out – Client Copilot Instructions

## Project
React Native / Expo (SDK 54) mobile app for Dogs Out, a social platform for dog owners. TypeScript, targeting iOS and Android via Expo Go (dev) and EAS Build (production).

## Architecture
Feature-based folder structure. Code organised by domain under `src/features/`.

## Build & Run
- Install: `npm install`
- Start: `npx expo start`
- Type check: `npx tsc --noEmit`
- Test: `npm test`

## Folder Structure
```
src/
├── app/           # Entry point, navigation
├── components/    # Shared UI components
├── features/      # Auth, profile, dogs, matching, chat, map
├── hooks/         # Custom React hooks
├── services/      # API calls (Axios), Socket.io
├── store/         # Global state
├── types/         # TypeScript interfaces
├── utils/         # Helper functions
└── constants/     # Colors, fonts, API URLs
```

## Conventions
- Functional components only, no class components
- TypeScript strict mode — no `any` types
- All API calls go through `src/services/api.ts`
- Business logic in custom hooks, not components
- Named exports for components, default exports for screens
- JWT token stored in AsyncStorage
- Never commit `.env` files

## Backend
- Local: http://localhost:8080
- All requests use Axios with JWT interceptor
- WebSockets via Socket.io for chat

## Testing
- Jest + React Native Testing Library
- Run: `npm test`

## CI
GitHub Actions runs type check and SonarCloud analysis on every push and PR to main.

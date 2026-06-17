# Dogs Out – Client

## Project Overview
Dogs Out is a mobile social platform for dog owners to discover and meet other dog owners nearby. Think "Tinder for Dogs". This is the React Native mobile app for iOS and Android.

## Tech Stack
- **Language:** TypeScript
- **Framework:** React Native with Expo (SDK 54)
- **Navigation:** React Navigation
- **State Management:** TBD (Zustand or Redux Toolkit)
- **HTTP Client:** Axios
- **Real-time:** Socket.io client (for chat)
- **Push Notifications:** Firebase Cloud Messaging (Expo Notifications)
- **Maps:** React Native Maps + Google Maps API
- **Local Storage:** AsyncStorage
- **Testing:** Jest + React Native Testing Library
- **CI/CD:** GitHub Actions + SonarCloud

## Architecture
Feature-based folder structure — organised by screen/domain, not by file type.

### Folder Structure
```
src/
├── app/                  # Entry point, navigation setup
├── components/           # Shared reusable components
│   ├── ui/               # Basic UI elements (Button, Input, Card)
│   └── layout/           # Layout components (Header, TabBar)
├── features/             # Feature modules
│   ├── auth/             # Login, Register, Google OAuth
│   ├── profile/          # User profile, edit profile
│   ├── dogs/             # Dog profiles, add/edit dog
│   ├── matching/         # Swipe interface, match list
│   ├── chat/             # Chat screen, message list
│   └── map/              # Nearby dogs map view
├── hooks/                # Custom React hooks
├── services/             # API calls, socket connection
│   ├── api.ts            # Axios instance + interceptors
│   └── socket.ts         # Socket.io client setup
├── store/                # Global state management
├── types/                # TypeScript interfaces and types
├── utils/                # Helper functions
└── constants/            # Colors, fonts, API URLs
```

## Backend Connection
- Local: http://localhost:8080
- Production: Railway (URL TBD)
- All API calls go through `src/services/api.ts`
- JWT token stored in AsyncStorage, attached to every request via Axios interceptor

## Domain Types

### User
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  dateOfBirth: string;
  bio: string;
  profilePicture: string;
  latitude: number;
  longitude: number;
  role: 'USER' | 'ADMIN';
  authProvider: 'LOCAL' | 'GOOGLE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Dog
```typescript
interface Dog {
  id: number;
  name: string;
  breed: string;
  age: number;
  bio: string;
  profilePicture: string;
  owner: User;
  createdAt: string;
}
```

### Match
```typescript
interface Match {
  id: number;
  user1: User;
  user2: User;
  status: 'PENDING' | 'MATCHED' | 'REJECTED';
  createdAt: string;
}
```

### Message
```typescript
interface Message {
  id: number;
  sender: User;
  receiver: User;
  matchId: number;
  content: string;
  sentAt: string;
  isRead: boolean;
}
```

## Screens

### Auth
- LoginScreen
- RegisterScreen
- GoogleOAuthScreen

### Main (Tab Navigation)
- DiscoverScreen (swipe interface)
- MatchesScreen (list of matches)
- ChatScreen (messages)
- MapScreen (nearby dogs)
- ProfileScreen (own profile)

### Stack Screens
- DogProfileScreen
- UserProfileScreen
- ChatDetailScreen
- EditProfileScreen
- AddDogScreen

## Coding Conventions
- Functional components only, no class components
- Custom hooks for all business logic (keep components clean)
- TypeScript strict mode — no `any` types
- All API calls in `services/`, never directly in components
- Use `ResponseEntity` pattern — always handle loading/error/success states
- Named exports for components, default exports for screens
- Styles using StyleSheet.create() or NativeWind (TBD)

## Running Locally
```bash
npx expo start
```
Scan QR code with Expo Go app (iOS/Android).
Make sure backend is running on localhost:8080.

## Testing
```bash
npm test
```
- Unit tests: Jest
- Component tests: React Native Testing Library

## Environment Variables (never commit these)
Create a `.env` file in the root:
```
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
EXPO_PUBLIC_MAPS_API_KEY=
```

## Current Status
- [x] Expo project initialised (SDK 54)
- [x] GitHub Actions CI with SonarCloud
- [ ] Navigation setup (React Navigation)
- [ ] Axios API service
- [ ] Auth screens (Login, Register)
- [ ] Google OAuth
- [ ] Dog profile screens
- [ ] Swipe/matching interface
- [ ] Chat with WebSockets
- [ ] Map view
- [ ] Push notifications
- [ ] App Store / TestFlight deployment

## Internship Context
This is a 12-week UZH Informatikpraktikum project (Jun 15 – Sep 4, 2026).
Supervisor: Lea Mutschler (weekly Tuesday meetings via Microsoft Teams).

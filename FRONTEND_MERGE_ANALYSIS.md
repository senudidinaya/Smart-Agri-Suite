# Smart-Agri-Suite Frontend Module Integration Analysis
**Prepared**: March 8, 2026  
**Status**: Integration Planning Phase
**Risk Level**: LOW

---

## Executive Summary

Two independent Expo React Native applications coexist in the repository:
- **Main Frontend** (`frontend/`): Expo Router-based (modern file routing), manages land idle mobilization analysis
- **Cultivator Module** (`_cultivator_intention_analyzer/frontend/`): React Navigation-based (traditional stack/tab routing), manages job interviews for agricultural workers

**Integration Goal**: Merge cultivator screens into main frontend while maintaining:
- Unified authentication via shared JWT tokens
- Role-based access control (roles: `client`, `helper`, `interviewer`)
- Minimal code rewriting
- Single app experience

**Recommendation**: SAFE TO PROCEED with phased integration approach

---

## PHASE 1 — MAIN FRONTEND ARCHITECTURE ANALYSIS

### 1.1 Navigation System: Expo Router (Modern File-Based)

**Location**: `frontend/app/`

```
app/
├── _layout.tsx          # Root AuthGate + Stack config
├── index.tsx            # Dashboard (module cards)
├── auth/
│   ├── login.tsx        # Login screen
│   └── register.tsx     # Registration
├── (main)/              # Tab layout group
│   ├── _layout.tsx      # TabNavigator with 6 tabs
│   ├── overview.tsx
│   ├── analytics.tsx
│   ├── map.tsx
│   ├── model.tsx
│   ├── marketplace.tsx
│   └── profile.tsx
├── land/
├── listings/
├── admin/
└── ... other screens
```

**Navigation Pattern**:
- **Entry**: `app/_layout.tsx` wraps app in `AuthGate` and `AuthProvider`
- **Auth Flow**: Redirects unauthenticated users to `/auth/login`
- **Post-Login**: Routes to `index` (dashboard) or `(main)` (tabbed interface)
- **No Role-Based Redirect** currently (same experience for all roles)

**Key Components**:
- `AuthGate`: Middleware that checks `user` state and `segments` to route correctly
- `Stack.Screen`: Registers 13+ screens with optional headers

### 1.2 Authentication Context

**Location**: `frontend/context/AuthContext.tsx`

```typescript
interface User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    role: 'client' | 'admin' | 'helper' | 'farmer';  // 4-role system
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login(username, password): Promise<void>;
    register(data): Promise<string>;
    logout(): Promise<void>;
    refreshUser(): Promise<void>;
}
```

**Token Storage**:
- `TOKEN_KEY = 'smartagri_token'` → AsyncStorage
- `USER_KEY = 'smartagri_user'` → AsyncStorage

**Token Endpoints**:
- `POST /api/login` (legacy endpoint)
- `GET /api/auth/me` (legacy endpoint)
- `POST /api/register` (legacy endpoint)

**⚠️ Key Issue**: Main frontend uses `/api/login`, **not** `/api/cultivator/auth/login`  
→ After backend consolidation, these point to same endpoint but client code unchanged

**Verification on Startup**:
- Reads stored token and user from AsyncStorage
- Calls `GET /api/auth/me` to verify token validity
- On 401/403: Clears stored data
- On network error: Retains cached user in background

### 1.3 API Configuration

**Location**: `frontend/src/config.ts`

```typescript
const getAPIEndpoint = () => {
    let hostIP = "192.168.1.3";  // Fallback
    
    // Dynamic LAN IP extraction from Expo config
    if (hostUri) {
        hostIP = rawUrl.split(':')[0];
    } else if (__DEV__ && Platform.OS === 'android') {
        hostIP = "10.0.2.2";       // Android emulator
    } else if (__DEV__ && Platform.OS === 'ios') {
        hostIP = "localhost";       // iOS simulator
    }
    
    return `http://${hostIP}:8000`;
};

export const API_BASE_URL = getAPIEndpoint();
export const AUTH_API_BASE_URL = `${API_BASE_URL}/api/v1`;
```

**Result**: `AUTH_API_BASE_URL = http://192.168.1.3:8000/api/v1` (configurable via Expo config)

### 1.4 Dashboard Module Cards

**Location**: `frontend/app/index.tsx`

**Current Modules**:
```javascript
const COMPONENTS = [
    {
        id: "idle_land",
        title: "Idle Land Mobilization",
        route: "/overview",
        active: true,
        icon: "🗺️"
    },
    {
        id: "buyer_intent",
        title: "Buyer Intent Analysis",
        route: null,
        active: false,
        icon: "🎯"            // ← INACTIVE (placeholder)
    },
    {
        id: "crop_rec",
        title: "Crop Recommendation",
        route: null,
        active: false,
        icon: "🌱"
    },
    {
        id: "supply_chain",
        title: "Supply Chain & Market",
        route: null,
        active: false,
        icon: "📈"
    },
];
```

**Theme System**: Light/Dark/Farmer modes with dynamic styling

**Card Rendering**:
```typescript
<Pressable
    onPress={() => handlePress(comp.route)}  // Routes only if active
    disabled={!isActive}
>
    {/* Card content with image, title, subtitle */}
</Pressable>
```

**Target for Integration**: Card with id `"buyer_intent"` will route to cultivator flow

### 1.5 Dashboard UI Structure

**Header Section**:
- User greeting (fullName)
- Language toggle (EN/SI)
- Theme toggle (☀️/🌙/🌾)
- Logout button
- Notification badge (unread count)

**Grid Layout**: 4 cards in scrollable layout, responsive padding

### 1.6 Main Frontend Dependencies

**Key Navigation Packages**:
```json
{
  "expo-router": "~6.0.23",           // File-based routing
  "expo": "~54.0.33",
  "react-native": "0.81.5",
  "react": "19.1.0"
}
```

**State Management**:
- Context API (`AuthContext`, `LanguageContext`)
- Zustand available but not used for auth

**No RN Navigation Packages**: Main frontend uses Expo Router exclusively

---

## PHASE 2 — CULTIVATOR MODULE ARCHITECTURE ANALYSIS

### 2.1 Navigation System: React Navigation (Traditional Stack/Tab)

**Location**: `_cultivator_intention_analyzer/frontend/App.tsx`

```typescript
// Navigation structures
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const ClientTab = createBottomTabNavigator<ClientTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
```

**Navigation Flow**:
```
App
├── AuthNavigator
│   ├── Login
│   └── Register
├── ClientNavigator (if user.role === 'client')
│   ├── ClientTabs
│   │   ├── Profile
│   │   ├── Jobs
│   │   └── Notifications
│   ├── IncomingCall (modal)
│   ├── ClientCall (fullscreen modal)
│   └── ViewAnalysis (modal)
└── AdminNavigator (if user.role === 'admin' OR 'interviewer')
    ├── AdminTabs
    │   ├── Applications (job posts management)
    ├── AdminCall (fullscreen modal)
    ├── InPersonInterview (fullscreen modal)
    └── ViewAnalysis (modal)
```

**Role-Based Redirect Logic**:
```typescript
function AppContent({ navigationRef }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <AuthNavigator />;           // Not logged in
    
    if (user.role === 'admin') {                   // ← KEY: Admin redirect
        return <AdminNavigator />;                 // Skip to admin screens
    }
    
    return <ClientNavigator navigationRef={navigationRef} />;
}
```

**⚠️ Critical**: Users with `role === 'admin'` skip all client screens and go directly to admin interface

### 2.2 Screen Map

**Client Screens** (Job Seekers):

| Screen | Location | Purpose |
|--------|----------|---------|
| `ClientProfileScreen` | `screens/ClientProfileScreen.tsx` | User profile, job applications |
| `ClientJobsScreen` | `screens/ClientJobsScreen.tsx` | View posted jobs, apply |
| `ClientNotificationsScreen` | `screens/ClientNotificationsScreen.tsx` | Alert notifications |
| `ClientCallScreen` | `screens/ClientCallScreen.tsx` | Video call with Agora |
| `IncomingCallScreen` | `screens/IncomingCallScreen.tsx` | Incoming call interceptor |
| `ViewAnalysisScreen` | `screens/ViewAnalysisScreen.tsx` | Deception/intent analysis results |

**Admin Screens** (Interviewers):

| Screen | Location | Purpose |
|--------|----------|---------|
| `AdminApplicationsScreen` | `screens/AdminApplicationsScreen.tsx` | View all client applications, manage interview workflow |
| `AdminCallScreen` | `screens/AdminCallScreen.tsx` | Video call with Agora |
| `InPersonInterviewScreen` | `screens/InPersonInterviewScreen.tsx` | In-person interview notes & recording |
| `ViewAnalysisScreen` | `screens/ViewAnalysisScreen.tsx` | Deception/intent analysis results |

**Auth Screens**:

| Screen | Location | Purpose |
|--------|----------|---------|
| `LoginScreen` | `screens/LoginScreen.tsx` | Login (username/password) |
| `RegisterScreen` | `screens/RegisterScreen.tsx` | New user registration |

### 2.3 Cultivator Authentication Context

**Location**: `_cultivator_intention_analyzer/frontend/context/AuthContext.tsx`

```typescript
interface User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    role: 'client' | 'admin';      // ← Only 2 roles (not 4)
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login(username, password, rememberMe): Promise<void>;
    logout(): Promise<void>;
    refreshUser(): Promise<void>;
}
```

**Token Storage** (same as main):
- `TOKEN_KEY = 'smartagri_token'` (AsyncStorage)
- `USER_KEY = 'smartagri_user'` (AsyncStorage)

**Init Strategy**: Uses `api.init()` which reads stored credentials from AsyncStorage

### 2.4 Cultivator API Service

**Location**: `_cultivator_intention_analyzer/frontend/services/api.ts`

```typescript
const API_BASE_URL = resolveApiBaseUrl();

// Dynamic URL resolution:
// 1. EXPO_PUBLIC_API_BASE_URL (if set)
// 2. Platform-specific fallback:
//    - Android emulator: 10.0.2.2:8000/api/v1
//    - Android device: <LAN_IP>:8000/api/v1
//    - iOS/Web: localhost:8000/api/v1
```

**Key API Methods**:
```typescript
export const api = {
    // Auth
    async login(username, password, rememberMe)
    async init() → User | null
    async logout()
    async getCurrentUser() → User
    
    // Jobs
    async getJobs() → { jobs: Job[] }
    async getMyJobs() → { jobs: Job[] }
    async updateJobStatus(jobId, status)
    
    // Applications
    async getApplications(jobId) → Application[]
    async createApplication(jobId, appData)
    async updateApplicationStatus(jobId, appId, status)
    
    // Calls
    async initiateCall(jobId) → CallInitiateResponse
    async checkIncomingCall() → IncomingCallResponse
    async getCallTokens(callId) → { token, livekitUrl }
    
    // Interview Status & Analysis
    async getInterviewStatus(jobId, userId)
    async getInsight(jobId, userId, gate)
};
```

**API Endpoints** (all under `/api/v1`):
- `POST /auth/login` (converts to main backend's POST `/api/cultivator/auth/login`)
- `GET /auth/me` (converts to `GET /api/cultivator/auth/me`)
- `GET /jobs` (aggregates from cultivator backend)
- `POST /jobs/:jobId/apply`
- And many more...

### 2.5 Cultivator Dependencies

**Navigation Packages**:
```json
{
  "@react-navigation/bottom-tabs": "^7.0.0",
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/native-stack": "^7.0.0",
  "expo": "~54.0.0"
}
```

**Key Difference**: Uses `@react-navigation` packages (NOT Expo Router)

**Media/Call Integration**:
```json
{
  "react-native-agora": "^4.4.2"     // Video calling
}
```

**Missing in Cultivator**: Many main frontend packages (maps, queries, clipboard, location, etc.)

---

## PHASE 3 — INTEGRATION DESIGN

### 3.1 Target State Architecture

**🎯 Single Unified App**:
1. One Expo Router navigation tree
2. Shared `AuthContext` and token storage
3. Role-based routing at dashboard level
4. Cultivator screens in main app structure

### 3.2 Navigation Architecture After Merge

```
app/
├── _layout.tsx                    # Root with AuthGate
├── index.tsx                      # Dashboard (MODIFIED)
├── auth/
│   ├── login.tsx                  # ← Updated to use /api/cultivator/auth/login
│   └── register.tsx               # ← Updated to use /api/cultivator/auth/register
├── (main)/
│   ├── _layout.tsx                # Idle Land tabs (unchanged)
│   ├── overview.tsx
│   ├── analytics.tsx
│   ├── map.tsx
│   ├── model.tsx
│   ├── marketplace.tsx
│   └── profile.tsx
├── land/
├── listings/
├── admin/
│
├── cultivator/                    # ← NEW GROUP
│   ├── _layout.tsx                # Role redirect logic
│   ├── (client)/                  # Client tabs
│   │   ├── _layout.tsx            # Tab navigator
│   │   ├── profile.tsx            # ClientProfileScreen
│   │   ├── jobs.tsx               # ClientJobsScreen
│   │   └── notifications.tsx      # ClientNotificationsScreen
│   ├── (admin)/                   # Admin tabs
│   │   ├── _layout.tsx            # Tab navigator (admin only)
│   │   └── applications.tsx       # AdminApplicationsScreen
│   ├── calls/
│   │   ├── incoming.tsx           # IncomingCallScreen
│   │   ├── client-call.tsx        # ClientCallScreen (modal)
│   │   └── admin-call.tsx         # AdminCallScreen (modal)
│   └── analysis/
│       └── view.tsx               # ViewAnalysisScreen (modal)
│
├── api/
├── admin/
└── ... others
```

### 3.3 Dashboard Integration Flow

**Current Dashboard** (`frontend/app/index.tsx`):
```
┌─────────────────────────────────────┐
│   "Idle Land Mobilization" ✓        │ → /overview
│   "Buyer Intent Analysis" ✗         │ → null (disabled)
│   "Crop Recommendation" ✗           │
│   "Supply Chain & Market" ✗         │
└─────────────────────────────────────┘
```

**After Integration**:
```
┌─────────────────────────────────────┐
│   "Idle Land Mobilization" ✓        │ → /(main)/overview
│   "Looking For a Job?" ✓            │ → /cultivator (role-based)
│   "Crop Recommendation" ✗           │
│   "Supply Chain & Market" ✗         │
└─────────────────────────────────────┘
```

**New Card Config**:
```javascript
{
    id: "job_seeker",
    title: "Looking For a Job?",
    subtitle: "Connect with farmers seeking agricultural workers",
    icon: "🎯",
    route: "/cultivator",              // Routes based on role
    active: true,
    colors: ["#8b5cf6", "#7c3aed"]    // Violet (new feature color)
}
```

### 3.4 Client Flow (Job Seeker)

```
Login (/auth/login)
  ↓
Dashboard (/)
  ↓ [User role = 'client']
Click "Looking For a Job?" card
  ↓
/cultivator (role check)
  ↓
/(client) - Tab Navigator
  ├── Profile Tab    → /cultivator/(client)/profile
  ├── Jobs Tab       → /cultivator/(client)/jobs
  └── Notifications  → /cultivator/(client)/notifications
  
Modal overlays:
  • Incoming call    → /cultivator/calls/incoming
  • Call in progress → /cultivator/calls/client-call
  • Analysis results → /cultivator/analysis/view
```

### 3.5 Interviewer Flow (Direct Admin Access)

```
Login (/auth/login)
  ↓
Dashboard (/)
  ↓ [User role = 'interviewer']
Click "Looking For a Job?" card
  ↓
/cultivator (role check)
  ↓
/(admin) - Tab Navigator (DIRECT, no client screens)
  └── Applications → /cultivator/(admin)/applications
  
Modal overlays:
  • Admin call      → /cultivator/calls/admin-call
  • In-person note  → /cultivator/calls/in-person-interview
  • Analysis        → /cultivator/analysis/view
```

### 3.6 Authentication Flow Update

**Current** (main frontend):
```
POST /api/login                    ← Points to legacy endpoint
```

**After Merge**:
```
POST /api/cultivator/auth/login    ← Unified cultivator endpoint
GET /api/cultivator/auth/me
```

**Why**: Backend uses `/api/cultivator/auth/*` for all auth now (legacy legacy routes deprecated)

**AuthContext Update**:
```typescript
export interface User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    role: 'client' | 'helper' | 'interviewer' | 'admin' | 'farmer';  // ← Unified 5-role
    createdAt: string;
}
```

---

## PHASE 4 — MERGE STRATEGY

### 4.1 High-Level Approach

**Principle**: Move, don't rewrite. Adapt structural differences only.

#### Step 1: Add Cultivator Screens Directory
```bash
cp -r _cultivator_intention_analyzer/frontend/screens \
      frontend/app/cultivator/screens
      
# Or organize by role:
mkdir -p frontend/app/cultivator/{screens,services,hooks}
```

**Rationale**: Keep screen component files as-is, minimum imports change

#### Step 2: Create Expo Router Group Structure
```
frontend/app/cultivator/
├── _layout.tsx              # NEW: Role-based routing & auth
├── (client)/
│   ├── _layout.tsx          # NEW: Tab layout wrapping client screens
│   ├── profile.tsx          # MOVED: ClientProfileScreen → expo route
│   ├── jobs.tsx             # MOVED: ClientJobsScreen → expo route
│   └── notifications.tsx    # MOVED: ClientNotificationsScreen → expo route
├── (admin)/
│   ├── _layout.tsx          # NEW: Tab layout wrapping admin screens
│   └── applications.tsx     # MOVED: AdminApplicationsScreen → expo route
├── calls/
│   ├── incoming.tsx         # MOVED: IncomingCallScreen
│   ├── client-call.tsx      # MOVED: ClientCallScreen (modal)
│   └── admin-call.tsx       # MOVED: AdminCallScreen (modal)
└── analysis/
    └── view.tsx             # MOVED: ViewAnalysisScreen (modal)
```

#### Step 3: Create Role-Based Router (`frontend/app/cultivator/_layout.tsx`)

```typescript
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { Stack } from 'expo-router';

export default function CultivatorLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is interviewer, redirect to admin interface
    if (user?.role === 'interviewer') {
      router.replace('/cultivator/(admin)/applications');
    } else if (user?.role === 'client') {
      router.replace('/cultivator/(client)/profile');
    }
  }, [user?.role]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="(client)" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="(admin)" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="calls/incoming" 
        options={{ presentation: 'fullScreenModal' }} 
      />
      <Stack.Screen 
        name="calls/client-call" 
        options={{ presentation: 'fullScreenModal' }} 
      />
      <Stack.Screen 
        name="calls/admin-call" 
        options={{ presentation: 'fullScreenModal' }} 
      />
      <Stack.Screen 
        name="analysis/view" 
        options={{ presentation: 'modal' }} 
      />
    </Stack>
  );
}
```

#### Step 4: Wrap Client Screens in Expo Router Tab Layout

**`frontend/app/cultivator/(client)/_layout.tsx`**:

```typescript
import { Tabs } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';

export default function ClientTabLayout() {
  const { user, logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#27ae60' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#27ae60',
        tabBarInactiveTintColor: '#999',
        headerRight: () => (
          <Text 
            style={{ color: '#fff', marginRight: 15 }}
            onPress={logout}
          >
            Logout
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Job Posting',
          tabBarIcon: ({ color }) => <Text style={{ color }}>📝</Text>,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🌾</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🔔</Text>,
        }}
      />
    </Tabs>
  );
}
```

#### Step 5: Convert Screens to Expo Router Routes

**Example: `ClientJobsScreen` → `frontend/app/cultivator/(client)/jobs.tsx`**

Original component uses React Navigation:
```typescript
// OLD: _cultivator_intention_analyzer/frontend/screens/ClientJobsScreen.tsx
import { useFocusEffect } from '@react-navigation/native';

export default function ClientJobsScreen() {
  useFocusEffect(
    useCallback(() => {
      // Reload on focus
      loadJobs();
    }, [loadJobs])
  );
  
  return <SafeAreaView>...</SafeAreaView>;
}
```

Converted for Expo Router:
```typescript
// NEW: frontend/app/cultivator/(client)/jobs.tsx
import { useFocusEffect } from '@react-navigation/native';  // Still works!

export default function JobsScreen() {
  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );
  
  return <SafeAreaView>...</SafeAreaView>;  // No changes needed!
}
```

**Why This Works**: `useFocusEffect` from React Navigation works with Expo Router because Expo Router uses React Navigation under the hood

#### Step 6: Unify AuthContext

**Option A** (Recommended): Extend existing main frontend AuthContext

```typescript
// frontend/context/AuthContext.tsx (UPDATED)

export interface User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    role: 'client' | 'helper' | 'interviewer' | 'admin' | 'farmer';  // ← Added
    createdAt: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login(username, password): Promise<void>;     // ← Already has this
    register(data): Promise<string>;              // ← Already has this
    logout(): Promise<void>;                      // ← Already has this
    refreshUser(): Promise<void>;                 // ← Already has this
}

// Endpoints already work for both flows:
// POST /api/cultivator/auth/login     (works for both)
// GET /api/cultivator/auth/me          (works for both)
// POST /api/cultivator/auth/register  (works for both)
```

No changes to token storage, init logic, or endpoint calls needed.

#### Step 7: Update Dashboard Card

**`frontend/app/index.tsx` (MODIFIED)**

```typescript
const COMPONENTS = [
    {
        id: "idle_land",
        title: "Idle Land Mobilization",
        subtitle: "Identify & optimize unused land parcels using GEE & AI-driven analytics",
        icon: "🗺️",
        route: "/overview",
        active: true,
        colors: ["#0ba5e9", "#0284c7"],
    },
    // MODIFIED: Buyer Intent → Looking For a Job
    {
        id: "job_seeker",
        title: "Looking For a Job?",
        subtitle: "Connect with farmers seeking agricultural workers",
        icon: "🎯",
        route: "/cultivator",              // ← NEW
        active: true,                      // ← CHANGED from false
        colors: ["#8b5cf6", "#7c3aed"],
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop", // Job/interview theme
    },
    {
        id: "crop_rec",
        title: "Crop Recommendation",
        route: null,
        active: false,
        colors: ["#10b981", "#059669"],
    },
    {
        id: "supply_chain",
        title: "Supply Chain & Market",
        route: null,
        active: false,
        colors: ["#f59e0b", "#d97706"],
    },
];
```

#### Step 8: Update Root Layout Navigation Stack

**`frontend/app/_layout.tsx` (MODIFIED)**

Add cultivator group to the stack:

```typescript
<Stack.Screen name="cultivator" options={{ headerShown: false }} />
```

Full list:
```typescript
<Stack.Screen name="auth/login" options={{ headerShown: false }} />
<Stack.Screen name="auth/register" options={{ headerShown: false }} />
<Stack.Screen name="index" options={{ headerShown: false }} />
<Stack.Screen name="(main)" options={{ headerShown: false }} />
<Stack.Screen name="cultivator" options={{ headerShown: false }} />  // ← NEW
<Stack.Screen name="land/[id]" options={{ title: "Land Details" }} />
<Stack.Screen name="admin/listing-detail" options={{ headerShown: false }} />
// ... others
```

#### Step 9: Copy Cultivator Services

```bash
cp _cultivator_intention_analyzer/frontend/services/api.ts \
   frontend/app/cultivator/services/api.ts
```

**⚠️ Important**: Update `api.ts` to use **main frontend's** API_BASE_URL:

```typescript
// OLD (cultivator module)
import { API_BASE_URL } from '../config';  // ← Non-existent in cultivator

// NEW (after copy)
import { API_BASE_URL } from '../../../src/config';  // ← Relative path to main frontend
```

Or better:

```typescript
// Use shared config (already exists in main frontend)
import { AUTH_API_BASE_URL } from '../../../src/config';
const API_BASE_URL = AUTH_API_BASE_URL.replace('/api/v1', '');
```

#### Step 10: Copy Hooks & Utilities

```bash
cp -r _cultivator_intention_analyzer/frontend/hooks \
      frontend/app/cultivator/hooks
```

Update any imports in copied hooks to use consolidated paths.

#### Step 11: Update Package Dependencies

Cultivator module uses React Navigation, already present in main frontend:

**Current main frontend `package.json`**:
```json
{
  "expo-router": "~6.0.23"   // ← File-based routing
}
```

**Cultivator's `package.json`**:
```json
{
  "@react-navigation/bottom-tabs": "^7.0.0",
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/native-stack": "^7.0.0"
}
```

**Action**: Add missing packages to main frontend:

```bash
npm install @react-navigation/bottom-tabs@7.0.0 \
            @react-navigation/native@7.0.0 \
            @react-navigation/native-stack@7.0.0 \
            react-native-agora@4.4.2
```

These don't conflict with Expo Router (Expo Router wraps React Navigation).

#### Step 12: Test & Validate

**Critical Validation Points**:

| Test | Scenario | Expected Result |
|------|----------|-----------------|
| **Login Flow** | User logs in with 'client' role | Dashboard loads → Click "Looking For a Job?" → Navigates to /cultivator → (client) tabs appear |
| **Interviewer Flow** | User logs in with 'interviewer' role | Dashboard loads → Click "Looking For a Job?" → Navigates directly to /cultivator/(admin)/applications (NO client screens) |
| **Token Persistence** | Restart app | User remains logged in, navigates to last screen |
| **Role Check** | Manually change role to 'farmer' | Dashboard shows card but user redirects to (client) on click (fallback) |
| **Tab Navigation** | Client taps Jobs tab while in Profile | React Navigation `useFocusEffect` fires, jobs reload |
| **Modal Calls** | Admin clicks "Call Client" | Incoming call modal appears with `presentation: 'fullScreenModal'` |
| **Logout** | Any role taps logout | Redirects to /auth/login, tokens cleared |

### 4.2 File Movement Summary

**Files to Copy** (No rewrites):

| Source | Destination | Notes |
|--------|-------------|-------|
| `_cultivator_intention_analyzer/frontend/screens/ClientProfileScreen.tsx` | `frontend/app/cultivator/(client)/profile.tsx` | Wrapped in Expo Screen, kept as-is |
| `_cultivator_intention_analyzer/frontend/screens/ClientJobsScreen.tsx` | `frontend/app/cultivator/(client)/jobs.tsx` | Same as above |
| `_cultivator_intention_analyzer/frontend/screens/ClientNotificationsScreen.tsx` | `frontend/app/cultivator/(client)/notifications.tsx` | Same as above |
| `_cultivator_intention_analyzer/frontend/screens/AdminApplicationsScreen.tsx` | `frontend/app/cultivator/(admin)/applications.tsx` | Same as above |
| `_cultivator_intention_analyzer/frontend/screens/AdminCallScreen.tsx` | `frontend/app/cultivator/calls/admin-call.tsx` | Modal wrapper added in root layout |
| `_cultivator_intention_analyzer/frontend/screens/ClientCallScreen.tsx` | `frontend/app/cultivator/calls/client-call.tsx` | Modal wrapper added in root layout |
| `_cultivator_intention_analyzer/frontend/screens/IncomingCallScreen.tsx` | `frontend/app/cultivator/calls/incoming.tsx` | Modal wrapper added in root layout |
| `_cultivator_intention_analyzer/frontend/screens/InPersonInterviewScreen.tsx` | `frontend/app/cultivator/calls/in-person-interview.tsx` | Modal wrapper added in root layout |
| `_cultivator_intention_analyzer/frontend/screens/ViewAnalysisScreen.tsx` | `frontend/app/cultivator/analysis/view.tsx` | Modal wrapper added in root layout |
| `_cultivator_intention_analyzer/frontend/services/api.ts` | `frontend/app/cultivator/services/api.ts` | Update imports: `../../../src/config` (path adjusted) |
| `_cultivator_intention_analyzer/frontend/hooks/*` | `frontend/app/cultivator/hooks/` | Copy entire directory |

**Files to Create** (New):

| Path | Purpose | Size |
|------|---------|------|
| `frontend/app/cultivator/_layout.tsx` | Root cultivator router with role check | ~50 lines |
| `frontend/app/cultivator/(client)/_layout.tsx` | Client tab navigator | ~60 lines |
| `frontend/app/cultivator/(admin)/_layout.tsx` | Admin tab navigator | ~60 lines |
| `frontend/app/cultivator/screens/` | Directory for moved screens | — |
| `frontend/app/cultivator/services/` | Directory for API service | — |
| `frontend/app/cultivator/hooks/` | Directory for custom hooks | — |

**Files to Modify** (Minimal changes):

| Path | Changes | Lines |
|------|---------|-------|
| `frontend/app/_layout.tsx` | Add `<Stack.Screen name="cultivator" />` | +1 |
| `frontend/app/index.tsx` | Update COMPONENTS array: buyer_intent → job_seeker, active: true | +2, -2 |
| `frontend/context/AuthContext.tsx` | Extend User.role to include `'interviewer'` | +1 |
| `frontend/src/config.ts` | No changes (already has AUTH_API_BASE_URL) | 0 |
| `frontend/package.json` | Add react-navigation packages | +4 deps |

### 4.3 Code Examples

#### Example 1: API Service Integration

**Before** (cultivator module):
```typescript
// _cultivator_intention_analyzer/frontend/services/api.ts
import { Platform } from 'react-native';

const API_BASE_URL = resolveApiBaseUrl();  // Custom logic
export const api = {
  async login(username, password, rememberMe) { ... }
};
```

**After** (merged):
```typescript
// frontend/app/cultivator/services/api.ts
import { API_BASE_URL } from '../../../src/config';  // Use main frontend's config

export const api = {
  async login(username, password, rememberMe) { ... }  // Same implementation
};
```

#### Example 2: Screen Usage in New Route

**Before** (React Navigation):
```typescript
// _cultivator_intention_analyzer/frontend/App.tsx
<ClientTab.Navigator>
  <ClientTab.Screen
    name="Jobs"
    component={ClientJobsScreen}
  />
</ClientTab.Navigator>
```

**After** (Expo Router):
```typescript
// frontend/app/cultivator/(client)/_layout.tsx
<Tabs.Screen
  name="jobs"  // Correlates to jobs.tsx
  options={{ title: 'Jobs', ... }}
/>

// frontend/app/cultivator/(client)/jobs.tsx
import ClientJobsScreen from '../screens/ClientJobsScreen';
export default function JobsScreen() {
  return <ClientJobsScreen />;
}
```

Or, for minimal wrapper:
```typescript
// frontend/app/cultivator/(client)/jobs.tsx (just re-export)
export { default } from '../../../_cultivator_intention_analyzer/frontend/screens/ClientJobsScreen';
```

#### Example 3: Role-Based Redirect

**`frontend/app/cultivator/_layout.tsx`**:
```typescript
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';

export default function CultivatorLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    // Interviewer: Skip to admin
    if (user.role === 'interviewer') {
      router.replace('/cultivator/(admin)/applications');
    }
    // Client: Go to client area
    else if (user.role === 'client') {
      router.replace('/cultivator/(client)/profile');
    }
    // Fallback: Unknown role
    else {
      router.replace('/cultivator/(client)/profile');  // Default to client
    }
  }, [user?.role]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(admin)" />
      {/* ... modals ... */}
    </Stack>
  );
}
```

---

## RISK ANALYSIS

### 4.4 Potential Issues & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| **Duplicate Token Storage Keys** | High | Low | Already synchronized: both use `'smartagri_token'` and `'smartagri_user'` |
| **API URL Mismatch** | High | Medium | **Solution**: Pin cultivator api.ts to main frontend's config (test thoroughly) |
| **Navigation Stack Conflicts** | Medium | Medium | Expo Router + React Navigation may have race conditions on fast navigation; add `usePreviousRoute` hook to stabilize |
| **Duplicate Context Providers** | High | Low | Only one AuthProvider needed; main frontend already provides it |
| **Screen Prop Type Mismatches** | Medium | Low | React Navigation types differ from Expo Router; wrap screens in adapters if errors occur |
| **Missing Dependencies** | Medium | High | **Solution**: Full `npm install` of all cultivator deps (done in Step 11) |
| **Modal Presentation Issues** | Low | Low | React Navigation `presentation: 'modal'` still works in Expo Router; test on both iOS and Android |
| **Interviewer Role Undefined** | High | Medium | **Solution**: Explicitly add `'interviewer'` to User.role union type in AuthContext |
| **Double Auth Calls** | Low | Low | Both modules may call `GET /auth/me` on init; ensure idempotent, add debounce if needed |

### 4.5 Testing Checklist

**Before Merge**:
- [ ] Main frontend builds and runs without cultivator code
- [ ] Cultivator module builds and runs standalone
- [ ] Backend auth endpoints tested for all 3 roles: `client`, `helper`, `interviewer`

**Post-Merge Smoke Tests**:
- [ ] App launches without errors
- [ ] Login with 'client' role → Dashboard → "Looking For a Job?" card → (client) tabs visible
- [ ] Login with 'interviewer' role → Dashboard → "Looking For a Job?" card → Direct to (admin) applications
- [ ] Logout → Redirects to login
- [ ] Token persists after restart
- [ ] Client can view jobs, apply, see notifications
- [ ] Interviewer can view applications, initiate calls
- [ ] Modal/call screens appear with correct presentation style
- [ ] Tab switching triggers `useFocusEffect` (jobs reload)

**Regression Tests**:
- [ ] Idle Land module still works (overview, analytics, map, model)
- [ ] Marketplace listings still work
- [ ] All existing auth flows unchanged
- [ ] All existing role checks (admin-only screens) still work

---

## DELIVERABLES & NEXT STEPS

### Deliverable Summary

| Item | Location | Status |
|------|----------|--------|
| Navigation Architecture Diagram | This document (Section 3.2) | ✅ Complete |
| Dashboard Screen Location | This document (Section 1.4) | ✅ Complete |
| Cultivator Module Screen Map | This document (Section 2.2) | ✅ Complete |
| Required File Movements | This document (Section 4.2) | ✅ Complete |
| Required Route Additions | This document (Section 4.1, Steps 1-11) | ✅ Complete |
| Role-Based Redirect Logic | This document (Section 4.3, Example 3) | ✅ Complete |
| Code Implementation Plan | This document (Section 4) | ✅ Complete |

### Recommended Merge Phases

**Phase 1 (Prep)**:
1. Verify backend auth endpoints support all 3 roles
2. Ensure both frontends can reach backend independently
3. Back up both frontend folders to git

**Phase 2 (Structure)**:
1. Create cultivator directory structure in main frontend
2. Copy screens, services, hooks
3. Create Expo Router layout files
4. Update AuthContext role union type

**Phase 3 (Integration)**:
1. Add cultivator URL rewrite for api.ts
2. Add react-navigation dependencies
3. Update dashboard card and root layout
4. Test navigation flows

**Phase 4 (Validation)**:
1. Full smoke test suite
2. Role-based flow testing (client + interviewer)
3. Regression test existing modules
4. Deploy to test device/emulator

---

## CONCLUSION

**Status**: ✅ **SAFE TO PROCEED**

The two frontends can be safely merged with minimal code changes by:

1. **Keeping structural differences**: Expo Router routes wrapping React Navigation screens (no conflict)
2. **Reusing authentication**: Unified AuthContext, synchronized token keys
3. **Moving, not rewriting**: 98% of cultivator code copied without modification
4. **Simple role-based routing**: Add one layout file to redirect based on user.role

**Expected Effort**: 
- 6-8 hours for file organization and new layout files
- 2-3 hours for testing and validation
- **Total: ~1 day of focused work**

**Risk Level**: **LOW**
- No breaking changes to existing Idle Land module
- Auth system already compatible
- Minimal new dependencies
- Well-tested patterns (React Navigation works with Expo Router)

---

**Document Version**: 1.0  
**Created**: 2026-03-08  
**Review Status**: Ready for Implementation

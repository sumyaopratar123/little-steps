# Little Steps – Trusted 24×7 Childcare Platform

A full-stack, enterprise-grade childcare platform connecting families with background-checked caregivers for scheduled daytime supervision, evening coverage, and round-the-clock 24/7 overnight care.

---

## 🌟 Key Features & Architecture

### 1. Three Distinct Role Workflows
- **Parent**:
  - Profile and child records management (allergies, special needs, routines).
  - Search verified providers with live filtering (city, 24/7 overnight availability, price range, star rating, specialty).
  - Real-time slot booking with instant price calculation and capacity validation.
  - Booking lifecycle tracking (`pending` → `confirmed` → `in-progress` → `completed` / `cancelled`).
  - Star ratings & verified reviews for completed sessions.
- **Childcare Provider**:
  - Credential and verification document submission (Government ID, Criminal Background Check, CPR & First Aid certificate).
  - Configurable rates (standard hourly rate, overnight rate) and maximum capacity limit.
  - 24/7 overnight availability toggle and schedule management.
  - Real-time booking management: accept/decline requests, start care sessions, and complete checkout.
  - Transparent earnings dashboard and reviews overview.
- **Admin**:
  - Executive platform analytics (user distribution, active care jobs, completed volume, platform fees).
  - Provider Verification Queue: inspect submitted credentials, approve verified badges, or reject with feedback.
  - User Moderation: search users, toggle active/suspended status.
  - Platform-wide bookings audit trail with force cancellation / dispute resolution.

### 2. Conflict & Safety Validation Engine
- **Strict Concurrent Capacity**: Prevents overbooking beyond each provider's max child capacity (e.g. 1–3 children maximum) during overlapping time intervals.
- **Operating Hours & 24/7 Guard**: Enforces provider schedule boundaries for daytime providers, while unlocking continuous shifts for 24/7 certified caregivers.
- **Status State Machine**: Enforces strict transitions; reviews can only be posted once a booking has been marked `completed`.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide React, React Router v6, Axios.
- **Backend**: Node.js, Express, MongoDB (Mongoose 8), JWT, BcryptJS.
- **Testing**: Built-in `node:test` runner, `node:assert`, Supertest.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.20.0)
- **MongoDB**: Running locally at `mongodb://127.0.0.1:27017`

### 1. Installation
Clone the repository or open the project folder, then install dependencies for both server and client:

```powershell
# In the root directory:
cd server
npm install

cd ../client
npm install
```

### 2. Environment Configuration
The backend comes pre-configured with `.env` in `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/little_steps
JWT_SECRET=littlesteps_secure_jwt_secret_key_2026
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Seed Database with Demo Accounts
Run the seed script to populate demo users, verified and pending providers, child profiles, and active bookings:

```powershell
# From the server directory:
npm run seed
```

### 4. Running the Application

**Option A — Run Backend:**
```powershell
cd server
npm start
# Server listens on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

**Option B — Run Frontend (Vite Dev Server):**
```powershell
cd client
npm run dev
# Frontend runs on http://localhost:3000
```

**Option C — Build Frontend for Production:**
```powershell
cd client
npm run build
```

---

## 🧪 Automated Integration Tests

To run the complete automated test suite (verifying authentication, provider verification flow, 24/7 booking logic, capacity conflicts, and reviews):

```powershell
cd server
npm test
```

### Test Results Summary:
```text
✔ GET /api/health should return status healthy
✔ POST /api/auth/login with wrong credentials should return 401
✔ GET /api/admin/stats without admin credentials should return 403 or 401
✔ GET /api/admin/stats with admin credentials should return platform stats
✔ PUT /api/providers/profile/update updates provider settings and 24x7 rates
✔ POST /api/providers/verification-docs allows provider to submit verification credentials
✔ Admin can view pending verifications and approve provider
✔ Parent cannot book provider with invalid time or unverified provider
✔ Parent books slot: Booking 1 (2 children, 14:00 - 18:00) succeeds
✔ Capacity conflict: Booking 2 (2 children in overlapping time 15:00 - 17:00) exceeds maxCapacity 3 -> 409 Conflict
✔ Allowed capacity: Booking 3 (1 child in overlapping time 15:00 - 17:00) fits within maxCapacity 3 -> 201 Created
✔ Provider confirms, starts, and completes booking
✔ Parent can review completed booking, updating provider rating
✔ Parent cannot duplicate review for the same booking
ℹ tests 14 | pass 14 | fail 0
```

---

## 👥 Demo Accounts & Credentials

The application includes a **Demo Fast-Switch Banner** at the top of every screen to switch between any role with a single click. You can also sign in manually with these credentials:

| Role | Email | Password | Details |
|------|-------|----------|---------|
| **Admin** | `admin@littlesteps.com` | `Admin@12345` | Platform analytics, verification queue, user moderation |
| **Verified Provider (24/7)** | `sarah.provider@littlesteps.com` | `Provider@123` | Pediatric nurse, 24/7 overnight shifts, active badge |
| **Daytime Provider** | `maria.provider@littlesteps.com` | `Provider@123` | Early Childhood Educator, daytime toddler care |
| **Pending Provider** | `david.provider@littlesteps.com` | `Provider@123` | Awaiting admin review in the verification queue |
| **Parent 1** | `emily.parent@littlesteps.com` | `Parent@123` | Registered children: Leo (peanut allergy), Chloe |
| **Parent 2** | `michael.parent@littlesteps.com` | `Parent@123` | Registered child: Oliver (1 yr) |

---

## 📋 API Endpoints Reference

### Authentication & Profiles (`/api/auth`)
- `POST /api/auth/register` - Create parent or provider account
- `POST /api/auth/login` - Authenticate user & issue JWT
- `GET /api/auth/me` - Get current session profile & child records
- `PUT /api/auth/profile` - Update family profile or child profiles

### Providers (`/api/providers`)
- `GET /api/providers` - Search verified providers (query by `city`, `is24x7`, `service`, `maxRate`, `minRating`, `search`)
- `GET /api/providers/:id` - Detailed provider profile & reviews
- `PUT /api/providers/profile/update` - Update rates, capacity, schedule, 24/7 availability (Provider only)
- `POST /api/providers/verification-docs` - Upload verification credentials (Provider only)

### Bookings (`/api/bookings`)
- `POST /api/bookings` - Create booking with capacity conflict & schedule checks (Parent only)
- `GET /api/bookings` - View user's bookings (filtered by role)
- `GET /api/bookings/:id` - View booking details
- `PATCH /api/bookings/:id/status` - Update status (`confirmed`, `in-progress`, `completed`, `cancelled`)

### Reviews (`/api/reviews`)
- `GET /api/reviews/provider/:providerId` - Public reviews for caregiver
- `POST /api/reviews` - Submit review for completed booking (Parent only)

### Admin Operations (`/api/admin`)
- `GET /api/admin/stats` - Platform health and financial metrics
- `GET /api/admin/verifications` - Pending caregiver verification submissions
- `PATCH /api/admin/verifications/:id` - Approve or reject provider verification
- `GET /api/admin/users` - User directory with role filtering
- `PATCH /api/admin/users/:id/toggle-status` - Activate or suspend user account
- `GET /api/admin/bookings` - Platform-wide bookings audit

---

## 🔒 Known Limitations & Production Enhancements
- **Live File Upload Storage**: Verification document uploads currently store verified metadata references and mock URLs (`https://storage.littlesteps.local/...`). For production, hook up AWS S3 or Google Cloud Storage signed upload URLs.
- **Payment Gateway**: Payouts and fees calculate accurately on the backend; connect Stripe Connect for live card authorization and automated provider payouts.

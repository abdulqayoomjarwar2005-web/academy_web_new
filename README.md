# Nation Builders Institute of Learning Larkana — Complete (All 13 Phases)

A full-stack Nation Builders Institute of Learning Larkana built with React (Vite + Tailwind) on the frontend and Node.js/Express/PostgreSQL on the backend.

## Features

| Phase | Module |
|-------|--------|
| 1 | Authentication, Roles (Owner / Admin / Teacher), JWT, Password Reset |
| 2 | Student Management (CRUD, Profile, Status) |
| 3 | Teacher Management (CRUD, Profile, Status) |
| 4 | Attendance (Mark, History, Edit Requests, Lock) |
| 5 | Attendance Reports (Daily & Monthly) |
| 6 | Fee Management (Generate, Pay, Receipts, Student Due) |
| 7 | Fee Defaulters Dashboard |
| 8 | Expense Management (CRUD, Categories, Dashboard) |
| 9 | Profit & Loss Reports (Monthly & Yearly) |
| 10 | Role-based Dashboard with live KPI stats |
| 11 | Reports & Exports (Excel + PDF) |
| 12 | Audit Log System |
| 13 | In-App Notifications |

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14

## Setup

### 1. Database

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -d your_database -f backend/src/config/schema.sql
```

Or use the migrate script (also seeds the default owner account):

```bash
cd backend
npm install
npm run migrate
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and JWT secret
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

## Default Login

After running `npm run migrate`, the default owner account is:

- **Email:** abdulqayoom@nb (or `DEFAULT_OWNER_EMAIL` from `.env`)
- **Password:** Aqayoom7878 (or `DEFAULT_OWNER_PASSWORD` from `.env`)

**Change this password immediately after first login.**

## Environment Variables

### Backend `.env`

```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/nbil_db
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
DEFAULT_OWNER_EMAIL=abdulqayoom@nb
DEFAULT_OWNER_PASSWORD=Aqayoom7878
# Email (optional, for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```

### Frontend `.env`

```
VITE_API_URL=http://localhost:5000
```

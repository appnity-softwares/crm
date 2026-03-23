<div align="center">

# 🏢 Appnity ERP-CRM

**A full-stack Enterprise Resource Planning & Customer Relationship Management platform**

Built with Go (Gin) · React (Vite) · PostgreSQL · Socket.io · Razorpay

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://golang.org)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)]()

</div>

---

## 📋 Overview

Appnity ERP-CRM is an all-in-one business management platform designed for service-based companies. It unifies CRM, project management, HR, finance, training, and real-time communication into a single, role-based application with dedicated portals for employees, clients, prospects, and trainees.

---

## ✨ Features at a Glance

| Module | Highlights |
|--------|-----------|
| 🔐 **Authentication** | JWT auth with auto-refresh, 7 user roles, permission-based access |
| 📊 **Dashboard** | Role-adaptive stats, revenue trends, attendance charts, department breakdown |
| 👥 **HR & Employees** | Full CRUD, department management, role assignment, profile avatars |
| 🤝 **CRM & Leads** | Lead pipeline (new → won/lost), SOW management, lead-to-client conversion |
| 📁 **Projects** | Lifecycle management, team assignments, member transfers, progress tracking |
| ✅ **Tasks** | Project-scoped tasks with status tracking and assignment |
| 🕐 **Attendance** | QR-based check-in, auto-checkout, manual entry, late detection |
| 📝 **Work Logs** | Daily hour tracking per project with admin review |
| 📈 **Daily Reports** | KPI metrics submission, admin review/approval workflow |
| 💰 **Finance** | Income & expense tracking with auto-balance adjustment, GST estimates |
| 🧾 **Invoices** | Invoice generation, Razorpay payments, milestone-based auto-invoicing |
| 💳 **Payroll** | Salary management, deductions, net pay calculation |
| 🏖️ **Leaves** | Leave application with approval workflow, type-based categorization |
| 💬 **Chat** | Real-time messaging via Socket.io with role-based visibility |
| 🔔 **Notifications** | In-app notifications for reviews, approvals, and system events |
| 🌐 **Client Portal** | Token-based external access to project updates, invoices, and payments |
| 🎓 **Training / LMS** | Course management, student enrollment, payment tracking, certification |
| 💼 **Job Board** | Internal job posting and listing for alumni/trainees |
| ⚙️ **Settings** | Feature flags, system configuration, role-based restrictions |
| 📢 **Notices** | Company-wide announcements from admin/managers |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        NGINX (Reverse Proxy)                     │
│              ┌──────────────────┬──────────────────┐             │
│              │  crm.appnity.cloud │ crmapi.appnity.cloud │       │
│              │   (Static Files)    │  (API + WebSocket)   │       │
│              └────────┬───────────┴────────┬───────────┘         │
└───────────────────────┼────────────────────┼─────────────────────┘
                        │                    │
          ┌─────────────▼──────┐   ┌─────────▼──────────────┐
          │   React Frontend   │   │   Go (Gin) Backend     │
          │   Vite + SPA       │   │   REST API + Socket.io │
          │   Port: Static     │   │   Port: 8084           │
          └────────────────────┘   └─────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │     PostgreSQL Database      │
                              │     GORM ORM + AutoMigrate   │
                              └──────────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────┐
                    │                        │                    │
             ┌──────▼──────┐    ┌────────────▼───┐    ┌──────────▼───┐
             │  Razorpay   │    │  Cloudinary    │    │  Socket.io   │
             │  Payments   │    │  Media Upload  │    │  Real-time   │
             └─────────────┘    └────────────────┘    └──────────────┘
```

---

## 🔐 Role & Permission System

The application supports **7 distinct roles** with granular access control:

| Role | Dashboard | Employees | Projects | Finance | CRM | Attendance | Chat | Portal |
|------|-----------|-----------|----------|---------|-----|------------|------|--------|
| **Admin** | Full stats + finance | Full CRUD | Full + delete | Full access | Full pipeline | QR gen, manual, edit | All users | — |
| **Manager** | Stats + departments | View all | Create, assign | View stats | Create, convert | View all | All users | — |
| **Employee** | Basic stats | View own | View assigned | — | — | Check in/out | Team + clients | — |
| **Client** | Client dashboard | — | View own | View invoices | — | — | Approved only | ✅ Token-based |
| **Prospect** | Prospect dashboard | — | — | — | Submit requirements | — | — | — |
| **Trainee** | Trainee dashboard | — | — | — | — | Check in/out | — | — |
| **Alumni** | — | — | — | — | — | — | — | Job board |

### Permission System

Beyond roles, individual users can receive **comma-separated permission strings** (e.g., `finance,leads,invoices`) that grant access to specific modules independent of their role.

---

## 📦 Module Documentation

### 🔐 Authentication & Authorization

| Feature | Description |
|---------|-------------|
| JWT Access Token | 24-hour expiry, HS256 signed |
| JWT Refresh Token | 7-day expiry, separate secret |
| Auto-Refresh | Axios interceptor auto-refreshes on 401 |
| Login Validation | Email + password with bcrypt verification |
| Account Status | Deactivated accounts blocked at login + refresh |
| Registration | Self-registration creates prospect accounts |

**Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/register` | No | Register prospect account |
| POST | `/api/auth/refresh` | No | Refresh access token |
| GET | `/api/profile` | JWT | Get current user profile |
| PUT | `/api/profile` | JWT | Update profile (name, phone, avatar, nav_style) |

---

### 📊 Dashboard

Role-adaptive dashboard providing:

- **Admin/Manager:** Employee count, project count, lead count, attendance stats, late arrivals, department breakdown, revenue growth chart, recent leads
- **Employee:** Personal stats, assigned projects, attendance
- **Client:** Project status, invoices, payment stats
- **Prospect:** Requirement submission form, lead profile
- **Trainee:** Enrolled courses, progress tracking

**Endpoint:** `GET /api/dashboard/stats`

---

### 👥 Employee Management

| Feature | Description |
|---------|-------------|
| Create Employee | Name, email, password, role, department, designation |
| List with Filters | Filter by role, department, active status |
| Profile Management | Avatar upload, navigation style preference |
| Role Assignment | Change role between all 7 types |
| Permission Grant | Assign module-level permissions |
| Soft Deactivation | Deactivate instead of hard delete |
| Employee Stats | Attendance, work logs, projects, KPI reports (last 30 days) |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/api/employees` | admin, manager | List all employees |
| GET | `/api/employees/:id` | admin, manager, employee | Get employee detail |
| GET | `/api/employees/:id/stats` | admin, manager | Get employee statistics |
| POST | `/api/employees` | admin | Create employee |
| PUT | `/api/employees/:id` | admin | Update employee |
| DELETE | `/api/employees/:id` | admin | Deactivate employee |

---

### 🤝 Client Management

| Feature | Description |
|---------|-------------|
| Client CRUD | Create, update, deactivate client accounts |
| Client Detail View | Projects, invoices, tickets, financial stats |
| Password Reset | Admin can set new password for clients |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/api/clients` | admin, manager | List all clients |
| GET | `/api/clients/:id` | admin, manager, client | Client detail + related data |
| POST | `/api/clients` | admin | Create client |
| PUT | `/api/clients/:id` | admin | Update client |
| DELETE | `/api/clients/:id` | admin | Deactivate client |

---

### 📈 CRM — Lead Pipeline

| Feature | Description |
|---------|-------------|
| Lead Creation | Name, email, phone, company, source, type (direct/outbound) |
| Pipeline Stages | new → contacted → qualified → proposal → won / lost |
| Lead Sources | website, referral, social, other |
| Assignment | Assign leads to team members |
| SOW Management | Statement of Work creation and client acceptance |
| Lead → Client Conversion | Transactional conversion creates: User account + Project + Portal token |
| Prospect Self-Service | Prospects can submit requirements and accept SOW |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/leads` | admin, manager | Create lead |
| GET | `/api/leads` | JWT | List all leads |
| GET | `/api/leads/:id` | JWT | Get lead detail |
| PUT | `/api/leads/:id` | admin, manager, prospect | Update lead |
| DELETE | `/api/leads/:id` | admin | Delete lead |
| POST | `/api/leads/:id/convert` | admin, manager | Convert to client |
| POST | `/api/leads/requirement` | prospect | Submit requirement |
| GET | `/api/leads/my-profile` | prospect | Get own lead profile |
| POST | `/api/leads/:id/sow/accept` | prospect | Accept SOW |

---

### 📁 Project Management

| Feature | Description |
|---------|-------------|
| Project Lifecycle | planning → active → on_hold → completed → under_maintenance → cancelled |
| Team Assignment | Assign members with roles (lead/member) |
| Member Transfer | Transfer members between projects with reason tracking |
| Progress Tracking | Manual + pending progress approval workflow |
| Client Portal Token | Auto-generated on creation for external access |
| Project Updates | Team posts updates visible to client via portal |
| Comments System | Threaded comments on project updates |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/projects` | admin, manager | Create project |
| GET | `/api/projects` | JWT | List all projects |
| GET | `/api/projects/:id` | JWT | Get project detail |
| PUT | `/api/projects/:id` | JWT | Update project |
| DELETE | `/api/projects/:id` | admin | Delete project |
| POST | `/api/projects/:id/assign` | admin, manager | Assign team member |
| POST | `/api/projects/:id/transfer` | admin, manager | Transfer member |
| PUT | `/api/projects/:id/approve` | admin, manager | Approve progress update |
| DELETE | `/api/projects/:id/members/:uid` | admin, manager | Remove member |

---

### ✅ Task Management

Project-scoped tasks with status tracking.

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/api/projects/:id/tasks` | JWT | List project tasks |
| POST | `/api/projects/tasks` | admin, manager, employee | Create task |
| PUT | `/api/projects/tasks/:id` | admin, manager, employee | Update task |
| DELETE | `/api/projects/tasks/:id` | admin, manager | Delete task |

---

### 🕐 Attendance System

| Feature | Description |
|---------|-------------|
| QR Check-in | Admin generates time-limited QR tokens (configurable duration) |
| Standard Check-in | Direct check-in with location/notes |
| Auto-Checkout | Background task auto-checks-out at configurable time |
| Manual Entry | Admin can create/edit attendance records |
| Late Detection | Configurable late threshold |
| My Attendance | Personal attendance history |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/attendance/check-in` | internal roles | Check in |
| PUT | `/api/attendance/check-out` | internal roles | Check out |
| GET | `/api/attendance` | admin, manager | All attendance records |
| GET | `/api/attendance/me` | internal roles | My attendance |
| GET | `/api/attendance/qr-token` | admin | Generate QR token |
| POST | `/api/attendance/qr-checkin` | internal roles | QR-based check-in |
| POST | `/api/attendance/manual` | admin | Manual attendance entry |
| PUT | `/api/attendance/:id` | admin | Edit attendance record |
| DELETE | `/api/attendance/:id` | admin | Delete attendance record |

---

### 📝 Work Logs

| Feature | Description |
|---------|-------------|
| Daily Logging | Hours, description, linked project |
| Admin Review | All work logs visible to admin/managers |
| Personal View | Employees see their own logs |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/worklogs` | admin, manager, employee | Create work log |
| GET | `/api/worklogs` | admin, manager | All work logs |
| GET | `/api/worklogs/me` | internal roles | My work logs |
| PUT | `/api/worklogs/:id` | internal roles | Update work log |
| DELETE | `/api/worklogs/:id` | admin | Delete work log |

---

### 📈 Daily Reports (KPI)

| Feature | Description |
|---------|-------------|
| Metrics Submission | JSON-formatted KPI metrics per day |
| Review Workflow | submitted → approved / rejected with admin remarks |
| Statistics | Aggregate stats: total, submitted, approved, rejected + per-user breakdown |
| Ownership | Only owner or admin can update |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/reports` | admin, manager, employee | Submit daily report |
| GET | `/api/reports` | admin, manager | All reports (paginated) |
| GET | `/api/reports/me` | internal roles | My reports (paginated) |
| GET | `/api/reports/stats` | admin, manager | Aggregate statistics |
| PUT | `/api/reports/:id` | internal roles | Update report |
| PUT | `/api/reports/:id/review` | admin | Review (approve/reject) |
| DELETE | `/api/reports/:id` | admin | Delete report |

---

### 💰 Finance System

#### Income

| Feature | Description |
|---------|-------------|
| Income Recording | Source, amount, category, date, linked project |
| Balance Auto-Adjust | Creates balance log entry in transaction |
| Filters | Date range, category |
| Pagination | `?page=1&limit=50` |

#### Expenses

| Feature | Description |
|---------|-------------|
| Expense Recording | Title, description, amount, date, category |
| Balance Auto-Adjust | Deducts from company balance in transaction |
| Partial Updates | Update individual fields without overwriting |

#### Company Balance

| Feature | Description |
|---------|-------------|
| Balance Tracking | Auto-calculated from income/expenses |
| Manual Adjustment | Admin can manually adjust balance with reason |
| Balance Logs | Full audit trail of all balance changes |

#### Finance Analytics

| Feature | Description |
|---------|-------------|
| Revenue vs Expense | Total paid invoices vs total expenses |
| GST Estimation | 18% GST calculation on income/expenses |
| Monthly Trends | Last 6 months income/expense breakdown |
| Net Profit | Revenue - Expenses calculation |

**Key Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/income` | admin | Create income (with balance adjustment) |
| GET | `/api/income` | admin, manager | List income (paginated) |
| POST | `/api/expenses` | admin | Create expense (with balance adjustment) |
| GET | `/api/expenses` | admin, manager | List expenses (paginated) |
| GET | `/api/finance/balance` | JWT | Get current balance |
| GET | `/api/finance/stats` | admin, manager | Revenue/expense stats |
| GET | `/api/finance/analytics` | admin, manager | Analytics dashboard data |
| POST | `/api/finance/balance/manual` | admin | Manual balance adjustment |

---

### 🧾 Invoices & Payments

| Feature | Description |
|---------|-------------|
| Invoice Generation | Auto-numbered (INV-YYYYMMDD-XXXX), tax calculation |
| Status Workflow | draft → sent → paid / overdue |
| Razorpay Integration | Create Razorpay order → client pays → verify signature → auto-update balance |
| Milestone Invoicing | Auto-generate invoices when project milestones are hit |
| Secure Portal Link | Each invoice gets a unique token for external access |
| Payment Reminders | Send reminders to clients (API-ready) |

**Key Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/invoices` | admin, manager | Create invoice |
| GET | `/api/invoices` | admin, manager | List invoices |
| PUT | `/api/invoices/:id/status` | admin | Update invoice status |
| POST | `/api/portal/:token/pay` | Public | Initialize Razorpay payment |
| POST | `/api/portal/:token/verify` | Public | Verify payment signature |

---

### 💳 Payroll

| Feature | Description |
|---------|-------------|
| Salary Records | Base salary, allowances, deductions, net pay |
| Monthly/Custom Period | Configurable pay period |
| Status Tracking | pending → paid |
| Employee Self-View | Employees can view their own payroll |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/payroll` | admin | Create payroll record |
| GET | `/api/payroll` | admin | All payroll records |
| GET | `/api/payroll/me` | internal roles | My payroll history |
| PUT | `/api/payroll/:id` | admin | Update payroll |

---

### 🏖️ Leave Management

| Feature | Description |
|---------|-------------|
| Leave Types | sick, casual, paid, other |
| Approval Workflow | pending → approved / rejected |
| Date Validation | End date must be ≥ start date |
| Admin Remarks | Reviewer can add remarks |
| Notifications | Auto-notify employee on review |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/leaves` | internal roles | Apply for leave |
| GET | `/api/leaves/me` | internal roles | My leave history |
| GET | `/api/leaves` | admin, manager | All leave requests (paginated) |
| PUT | `/api/leaves/:id/review` | admin, manager | Approve/reject leave |

---

### 💬 Real-Time Chat

| Feature | Description |
|---------|-------------|
| Real-Time Messaging | Socket.io-powered instant delivery |
| Message Types | text, image, link |
| Edit/Delete | Edit within 2 hours, sender-only delete |
| Read Receipts | Automatic "seen" status on history load |
| Unread Counts | Per-conversation unread message count |
| Role-Based Visibility | Admin/Manager see all; employees see team + project clients; clients see approved users only |
| Chat Permissions | Clients request permission, admin approves |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/api/chat/conversations` | JWT | List available conversations |
| GET | `/api/chat/history/:otherID` | JWT | Get chat history + mark as seen |
| POST | `/api/chat/send` | JWT | Send message |
| PUT | `/api/chat/:id` | JWT | Edit message (2hr limit) |
| DELETE | `/api/chat/:id` | JWT | Delete message (sender only) |
| GET | `/api/chat/permissions` | JWT | View chat permissions |
| POST | `/api/chat/permissions/request` | JWT | Request chat access |
| PUT | `/api/chat/permissions/:id` | admin | Approve/reject permission |

---

### 🌐 Client Portal

A token-based public portal providing external access without authentication:

| Feature | Description |
|---------|-------------|
| Project View | Progress, status, team assignments |
| Invoice View | All project invoices with payment status |
| Payments | Razorpay-integrated payments |
| Support Tickets | Create and view project tickets |
| SOW Acceptance | Accept Statement of Work |
| Project Updates | View team-posted updates with comments |

**Endpoints:** All under `/api/portal/:token/*`

---

### 🎓 Training / LMS

| Feature | Description |
|---------|-------------|
| Course Management | Title, description, syllabus, duration, fee |
| Student Enrollment | Enroll trainees in courses with start dates |
| Progress Tracking | Completed topics, status updates |
| Payment Recording | Track and record enrollment payments as income |
| Auto Role Transition | Trainee → Alumni on course completion |
| Certifications | Certificate and offer letter link tracking |

**Endpoints:**
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/training/courses` | admin, manager | Create course |
| GET | `/api/training/courses` | JWT | List courses |
| PUT | `/api/training/courses/:id` | admin, manager | Update course |
| POST | `/api/training/enrollments` | admin, manager | Enroll student |
| GET | `/api/training/enrollments` | admin, manager | List enrollments |
| PUT | `/api/training/enrollments/:id` | admin, manager, trainee | Update enrollment |
| POST | `/api/training/enrollments/:id/payments` | admin, manager | Record payment |
| GET | `/api/training/enrollments/me` | trainee, alumni | My enrollments |

---

### 💼 Job Board

Internal job board for alumni and trainees.

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/api/jobs` | JWT | List open jobs |
| POST | `/api/jobs` | admin, manager | Post job |
| DELETE | `/api/jobs/:id` | admin, manager | Remove job |

---

### ⚙️ System Configuration

| Feature | Description |
|---------|-------------|
| Feature Flags | Toggle system features (QR attendance, manual attendance, performance dashboard) |
| Notice Board | Company-wide announcements |
| Notifications | In-app alerts for reviews, approvals, status changes |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go 1.21+, Gin HTTP framework |
| **ORM** | GORM with PostgreSQL driver |
| **Database** | PostgreSQL 16+ |
| **Authentication** | JWT (golang-jwt/v5) with bcrypt password hashing |
| **Frontend** | React 19, Vite, React Router v6 |
| **State Management** | React Context API (Auth, Theme, Notifications) |
| **HTTP Client** | Axios with auto-refresh interceptor |
| **Real-Time** | Socket.io (go-socket.io server + client) |
| **Payments** | Razorpay Go SDK |
| **Media** | Cloudinary (upload preset integration) |
| **Deployment** | Nginx reverse proxy + Certbot SSL + systemd |

---

## 🚀 Getting Started

### Prerequisites

- Go 1.21+
- Node.js 20+
- PostgreSQL 16+

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/appnity-softwares/crm.git
cd crm

# Create environment file
cp .env.example .env
# Edit .env with your database and API credentials

# Install Go dependencies
go mod tidy

# Run the server
go run ./cmd/server
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

```env
# Server
PORT=8080
GIN_MODE=release              # "release" for production, "debug" for development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=erp_crm

# JWT (REQUIRED in production)
JWT_SECRET=your-32-char-random-secret
JWT_REFRESH_SECRET=your-32-char-random-refresh-secret

# CORS (comma-separated origins)
CORS_ALLOWED_ORIGINS=https://crm.yourdomain.com

# Admin Seed (first-run only)
ADMIN_SEED_PASSWORD=YourStrongPassword
ADMIN_SEED_EMAIL=admin@yourdomain.com

# Payments (optional)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

# Media (optional)
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_UPLOAD_PRESET=your_preset
```

---

## 🌐 Production Deployment

### Automated VPS Setup

```bash
# On a fresh Ubuntu VPS with root access:
sudo ./vps-setup.sh
```

This script automatically:
1. Installs Go, Node.js, PostgreSQL, Nginx, Certbot
2. Creates database with secure credentials
3. Generates JWT secrets and admin password
4. Builds backend binary + frontend static files
5. Configures systemd service with auto-restart
6. Sets up Nginx reverse proxy with WebSocket support
7. Provisions SSL certificates via Let's Encrypt

### Manual Deployment

```bash
# Build backend
go build -o erpcrm_backend ./cmd/server

# Build frontend
cd frontend && npm run build

# Run with environment
GIN_MODE=release ./erpcrm_backend
```

### Production Checklist

- [x] `GIN_MODE=release` set
- [x] JWT secrets configured (min 32 characters)
- [x] `CORS_ALLOWED_ORIGINS` set to production domain
- [x] Admin seed password changed after first login
- [x] HTTPS configured via Nginx + Certbot
- [x] Systemd service enabled for auto-restart
- [x] Database credentials secured
- [x] HTTP timeouts configured (Read: 15s, Write: 15s, Idle: 60s)
- [x] Security headers enabled (X-Frame-Options, CSP, HSTS, nosniff)

---

## 📄 API Overview

The API follows RESTful conventions with consistent JSON responses:

```json
// Success
{ "message": "Resource created", "resource": { ... } }

// Error
{ "error": "Description of what went wrong" }

// Paginated List
{ "count": 150, "page": 1, "limit": 50, "resources": [ ... ] }
```

### Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Rate Limiting

Authentication endpoints are rate-limited to **5 requests per 5 seconds** per IP.

---

## 🗄️ Database Schema

Key models and their relationships:

```
User (1) ─────── (N) Attendance
User (1) ─────── (N) WorkLog
User (1) ─────── (N) DailyReport
User (1) ─────── (N) Leave
User (1) ─────── (N) Payroll
User (1) ─────── (N) Message (sender)
User (1) ─────── (N) Notification

Lead (1) ─────── (1) User (after conversion)

Project (1) ────── (N) ProjectAssignment ──── (1) User
Project (1) ────── (N) ProjectTransfer
Project (1) ────── (N) ProjectUpdate ─── (N) ProjectComment
Project (1) ────── (N) Task
Project (1) ────── (N) Invoice
Project (1) ────── (N) Ticket
Project (1) ────── (N) Income

Invoice (1) ────── (N) Payment (via Razorpay)

Course (1) ─────── (N) Enrollment ──── (1) User (student)
Enrollment (1) ─── (N) Income (payments)

CompanyBalance (1) ── (N) BalanceLog
```

---

## 🔮 Future Improvements

- [ ] Token blacklist / revocation via Redis
- [ ] Password change & reset via email
- [ ] SMTP integration for invoice reminders
- [ ] Global API rate limiting
- [ ] Frontend code splitting for smaller bundles
- [ ] Redis adapter for Socket.io horizontal scaling
- [ ] Audit logging for compliance
- [ ] Bulk operations (CSV import/export)
- [ ] Mobile app (React Native)

---

## 📝 License

Proprietary — © 2026 Appnity Softwares. All rights reserved.

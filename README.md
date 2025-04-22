
# Maths Magic Town Platform

A comprehensive educational platform for mathematics learning, test preparation, and doubt clearing sessions.

## Prerequisites

- Node.js 16+ 
- PostgreSQL 15+ or SQLite 3+
- NPM 8+

## Tech Stack

- Frontend: React 18 with TypeScript, TailwindCSS, shadcn/ui
- Backend: Express.js with TypeScript
- Database: PostgreSQL/SQLite with Drizzle ORM
- Authentication: Passport.js with session-based auth
- State Management: TanStack Query (React Query)
- Forms: React Hook Form with Zod validation
- Routing: Wouter
- UI Components: Radix UI primitives

## Database Configuration

The application supports both PostgreSQL and SQLite:

### PostgreSQL Setup (Recommended for Production)

1. Create a PostgreSQL database
2. Set the `DATABASE_URL` environment variable in `.env`:
```
DATABASE_URL=postgres://username:password@host:port/database
```

### SQLite Setup (Development Fallback)

If no `DATABASE_URL` is provided, the app automatically uses SQLite, stored in `./data/maths-magic-town.db`

## Environment Setup

Create a `.env` file with:

```env
# Database Configuration
DATABASE_URL=postgres://username:password@host:port/database

# Session Secret
SESSION_SECRET=your-secret-key

# Node Environment
NODE_ENV=development
```

## Installation & Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

## Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run check        # TypeScript type checking

# Database
npm run db:push      # Run database migrations

# Production
npm run build        # Build for production
npm run start        # Start production server
```

## Project Structure

```
├── /client          # Frontend React application
│   ├── /src
│   │   ├── /components  # Reusable components
│   │   ├── /hooks      # Custom React hooks
│   │   ├── /lib        # Utilities and constants
│   │   ├── /pages      # Page components
│   │   └── /types      # TypeScript definitions
├── /server          # Backend Express.js API
│   ├── auth.ts      # Authentication logic
│   ├── routes.ts    # API routes
│   └── storage.ts   # Database operations
├── /shared          # Shared types and schemas
├── /uploads         # User-uploaded files
└── /data           # SQLite database (when using SQLite)
```

## Database Schema

### Core Tables

1. **Users**
```sql
- id (serial, primary key)
- username (text, unique)
- password (text)
- email (text, unique)
- fullName (text)
- phone (text, optional)
- role (text: "admin", "teacher", "user")
- createdAt (timestamp)
```

2. **Courses**
```sql
- id (serial, primary key)
- title (text)
- description (text)
- duration (text)
- modules (integer)
- price (integer)
- discountPrice (integer, optional)
- imageUrl (text)
- categories (text[])
- popular (boolean)
- isLive (boolean)
- creatorId (integer, references users)
- isPublished (boolean)
- createdAt (timestamp)
```

3. **Test Series**
```sql
- id (serial, primary key)
- title (text)
- description (text)
- category (text)
- testCount (integer)
- price (integer)
- features (text[])
- creatorId (integer, references users)
- isPublished (boolean)
- createdAt (timestamp)
```

4. **Tests**
```sql
- id (serial, primary key)
- title (text)
- description (text)
- testSeriesId (integer, references test_series)
- duration (integer, minutes)
- totalMarks (integer)
- passingMarks (integer)
- negativeMarking (decimal)
- instructions (text, optional)
- fileUrl (text, optional)
- isActive (boolean)
- createdAt (timestamp)
```

### Supporting Tables

- Questions (test questions)
- Options (question options)
- Explanations (answer explanations)
- TestAttempts (user test attempts)
- UserAnswers (user responses)
- DoubtSessions (doubt clearing sessions)
- Testimonials (user testimonials)
- Contacts (contact form submissions)
- FAQs (frequently asked questions)
- SiteConfig (site configuration)
- CourseVideos (course video content)

## Configuration & Ports

- Development server runs on port 5000
- API endpoints are prefixed with `/api`
- Static files are served from `/uploads` directory

## Default Accounts

### Admin Access
- Username: `admin`
- Password: `admin123`
(Change this password after first login)

### Teacher Access
- Username: `teacher`
- Password: `teacher123`

## File Upload Limits

- Video files: up to 100MB
- Images: up to 5MB
- Documents: up to 10MB

## Key Features

- Course Management
  - Create and edit courses
  - Upload and manage video content
  - Set pricing and categories

- Test Series Management
  - Create test series with multiple tests
  - Question bank management
  - Auto-grading system

- Doubt Clearing Sessions
  - Schedule doubt sessions
  - Track session history
  - Student-teacher interaction

- User Management
  - Role-based access control
  - Profile management
  - Progress tracking

- Admin Dashboard
  - User management
  - Content moderation
  - Analytics and reporting

## Dependencies

All required dependencies are listed in package.json and will be installed with `npm install`. Key dependencies include:

- Frontend: react, react-dom, react-hook-form, @tanstack/react-query
- UI: shadcn/ui components, tailwindcss, radix-ui primitives
- Backend: express, passport, drizzle-orm
- Database: @neondatabase/serverless (PostgreSQL) or better-sqlite3 (SQLite)
- Utils: zod (validation), date-fns (date handling), typescript

## License

This project is licensed under the MIT License - see the LICENSE file for details

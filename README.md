# DummyApp - Authentication System

A modern Next.js application with authentication pages featuring login and registration functionality.

## Features

- 🏠 **Home Page** (`/`) - Welcome page with feature highlights
- 🔐 **Login Page** (`/login`) - User authentication with form validation
- 📝 **Register Page** (`/register`) - User registration with password confirmation
- 📊 **Dashboard** (`/auth/dashboard`) - Protected dashboard page after login

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Zod** - Schema validation
- **React Hook Form** - Form state management
- **@hookform/resolvers** - Zod integration with React Hook Form

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
dummyapp/
├── app/
│   ├── auth/
│   │   └── dashboard/
│   │       └── page.tsx      # Dashboard page
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── register/
│   │   └── page.tsx            # Register page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── components/
│   ├── forms/
│   │   ├── LoginForm.tsx     # Login form component
│   │   └── RegisterForm.tsx  # Register form component
│   ├── ui/
│   │   ├── Button.tsx        # Reusable button component
│   │   ├── Input.tsx         # Reusable input component
│   │   └── Card.tsx          # Reusable card component
│   └── Navigation.tsx        # Navigation component
└── package.json
```

## Form Validation

Both login and registration forms use **Zod** for schema validation:

- **Login Form**: Validates email format and password length (minimum 6 characters)
- **Register Form**: Validates name, email, password, and password confirmation matching

## Component Architecture

The application follows a component separation pattern:

- **UI Components** (`components/ui/`) - Reusable, presentational components
- **Form Components** (`components/forms/`) - Form-specific components with validation logic
- **Layout Components** (`components/`) - Layout and navigation components

## Development

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## License

This project is created for educational purposes.



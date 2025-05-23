# MeetIt Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── (auth)/            # Authentication routes
│   │   ├── login/
│   │   ├── register/
│   │   └── callback/
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── meetings/
│   │   ├── settings/
│   │   └── profile/
│   ├── api/               # API routes
│   │   ├── auth/
│   │   ├── transcription/
│   │   └── ai/
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # Basic UI components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── lib/                  # Utility functions and shared logic
│   ├── utils/           # Helper functions
│   ├── hooks/           # Custom React hooks
│   ├── services/        # External service integrations
│   └── types/           # TypeScript type definitions
├── styles/              # Global styles and Tailwind config
├── config/              # Configuration files
└── middleware.ts        # Next.js middleware for auth
```

## Key Dependencies

### Core Dependencies
- Next.js 13+ (App Router)
- React 18+
- TypeScript
- TailwindCSS
- DaisyUI

### Authentication & Security
- NextAuth.js (AuthJS)
- bcryptjs
- jsonwebtoken

### Database & ORM
- MongoDB
- Mongoose

### AI & Transcription
- OpenAI API (for transcription and summarization)
- WebSocket (for real-time features)

### UI & Styling
- DaisyUI
- React Icons
- React Hot Toast
- React Query

### Development Tools
- ESLint
- Prettier
- Husky (git hooks)
- Jest & React Testing Library 
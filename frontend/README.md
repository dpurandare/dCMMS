# dCMMS Frontend

Next.js 14 frontend for the Distributed Computerized Maintenance Management System.

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) with your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Radix UI** - Accessible component primitives
- **Zustand** - State management
- **Axios** - HTTP client
- **Jest** - Testing framework

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── lib/             # Utilities and helpers
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
└── docs/               # Documentation
```

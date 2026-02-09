# HealthProof

Health claims verification platform powered by AI and scientific literature.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- OpenAI API key

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Set up the database**
   ```bash
   # Start PostgreSQL and Redis (or use Docker)
   docker run -d --name healthproof-postgres -p 5432:5432 \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=healthproof \
     ankane/pgvector

   docker run -d --name healthproof-redis -p 6379:6379 redis:7

   # Generate Prisma client and push schema
   npm run db:generate
   npm run db:push
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Run the worker (in a separate terminal)**
   ```bash
   npm run worker
   ```

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Railway Deployment

1. Create a new project on [Railway](https://railway.app)
2. Add PostgreSQL and Redis services
3. Connect your GitHub repository
4. Add environment variables from `.env.example`
5. Deploy!

For the worker, create a separate service with start command: `npm run worker`

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/          # Auth.js routes
│   ├── auth/              # Auth pages
│   ├── claims/            # Claims pages
│   ├── dashboard/         # User dashboard
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and clients
│   ├── auth.ts           # Auth.js configuration
│   ├── prisma.ts         # Prisma client
│   ├── redis.ts          # Redis client
│   ├── queue.ts          # BullMQ queues
│   ├── openai.ts         # OpenAI client
│   ├── pubmed.ts         # PubMed API client
│   ├── arxiv.ts          # arXiv API client
│   └── utils.ts          # Utility functions
├── types/                 # TypeScript types
│   └── next-auth.d.ts    # Auth.js type extensions
└── workers/              # Background workers
    └── dossier-worker.ts # Dossier generation worker

prisma/
└── schema.prisma         # Database schema
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Vector Store**: pgvector
- **Queue**: BullMQ + Redis
- **Auth**: Auth.js (NextAuth v5)
- **AI**: OpenAI (embeddings, synthesis)
- **Data Sources**: PubMed, arXiv
- **UI**: Tailwind CSS, shadcn/ui
- **Charts**: Recharts

## Development Phases

- [x] **Phase 0**: Project foundation
- [x] **Phase 1 (Coin System)**: Auditable ledger, reduced rewards, improved sinks
- [ ] **Phase 1 (Research)**: AI paper analysis & evidence dashboard
- [ ] **Phase 2**: Social sentiment & forecasting with pool betting
- [ ] **Phase 3**: Monetization & gating

## License

Proprietary - All rights reserved

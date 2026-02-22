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
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── admin/claims/         # Admin CRUD + resolve endpoints
│   │   ├── auth/                 # Auth.js routes + signup
│   │   ├── claims/               # Public claims API
│   │   │   └── [claimId]/        # Claim detail, vote, evidence,
│   │   │       │                 #   research, verdict, unlock-analysis
│   │   │       └── research/status/
│   │   ├── coins/                # Daily-login, history
│   │   └── health/               # Health-check endpoint
│   ├── about/                    # About page
│   ├── admin/                    # Admin dashboard (layout, loading)
│   ├── auth/                     # Sign-in / sign-up pages
│   ├── claims/                   # Claims list + detail pages
│   │   └── [claimId]/            # Claim detail (layout, loading)
│   ├── coins/                    # Coin balance page
│   ├── dashboard/                # User dashboard
│   ├── privacy/                  # Privacy policy
│   ├── terms/                    # Terms of service
│   ├── error.tsx                 # Global error boundary
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Root loading skeleton
│   ├── not-found.tsx             # 404 page
│   ├── page.tsx                  # Home / landing page
│   ├── robots.ts                 # robots.txt generation
│   └── sitemap.ts                # sitemap.xml generation
├── components/                   # React components
│   ├── admin/                    # Admin-specific components
│   │   ├── claim-row.tsx         # Claim table row
│   │   ├── create-claim.tsx      # Create claim form
│   │   └── resolve-modal.tsx     # Resolve claim modal
│   ├── ui/                       # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── progress.tsx
│   ├── claim-card.tsx            # Claim summary card
│   ├── claims-list.tsx           # Paginated claims list
│   ├── coin-balance.tsx          # Coin balance display
│   ├── coin-history.tsx          # Coin transaction history
│   ├── daily-login-banner.tsx    # Daily login reward banner
│   ├── evidence-card.tsx         # Single evidence card
│   ├── evidence-list.tsx         # Evidence list with fetch
│   ├── footer.tsx                # Site footer
│   ├── header.tsx                # Site header / navbar
│   ├── research-progress.tsx     # Research progress poller
│   ├── session-provider.tsx      # Auth session provider
│   ├── user-menu.tsx             # User avatar dropdown
│   ├── verdict-card.tsx          # AI verdict display
│   └── vote-buttons.tsx          # Yes / No vote buttons
├── lib/                          # Core business logic & clients
│   ├── arxiv.ts                  # arXiv API client
│   ├── auth.ts                   # Auth.js configuration
│   ├── chunker.ts                # Text chunking for embeddings
│   ├── cn.ts                     # className utility
│   ├── coin-service.ts           # Coin ledger operations
│   ├── env.ts                    # Environment validation (Zod)
│   ├── openai.ts                 # OpenAI client (embeddings, LLM)
│   ├── prisma.ts                 # Prisma client singleton
│   ├── prompts.ts                # LLM prompt templates
│   ├── pubmed.ts                 # PubMed / NCBI API client
│   ├── queue.ts                  # BullMQ queue definitions
│   ├── rate-limit.ts             # In-memory rate limiter
│   ├── redis.ts                  # Redis connection factory
│   ├── semantic-scholar.ts       # Semantic Scholar API client
│   ├── utils.ts                  # General utilities
│   └── vector-search.ts          # pgvector similarity search
├── types/
│   └── next-auth.d.ts            # Auth.js type extensions
├── workers/
│   └── dossier-worker.ts         # 10-step RAG pipeline worker
├── instrumentation.ts            # Next.js instrumentation hook
└── middleware.ts                  # Security headers middleware

src/__tests__/                    # Test suites (41 files, 408 tests)
├── api/                          # API route tests
│   ├── admin/                    # Admin endpoint tests
│   ├── auth/                     # Auth endpoint tests
│   ├── claims/                   # Claims endpoint tests
│   ├── health.test.ts
│   └── security-validation.test.ts
├── auth/                         # Auth page component tests
├── components/                   # Component tests
├── lib/                          # Library / utility tests
├── middleware/                    # Middleware tests
├── pages/                        # Page-level tests
├── seed/                         # Seed data tests
├── seo/                          # SEO / metadata tests
├── workers/                      # Worker tests
└── setup.ts                      # Test setup (jest-dom matchers)

prisma/
├── schema.prisma                 # Database schema (pgvector)
├── seed.ts                       # Database seeder
├── seed-data.ts                  # Seed data definitions
└── sql/
    └── add_vector_index.sql      # Vector similarity index

docs/                             # Project documentation
├── architecture.md
├── economy-frontend.md
├── economy-v1.md
├── essential-pages.md
├── initial-features.md
├── rag-engine.md
├── security-seo.md
├── seed-data-admin.md
└── voting-flow.md
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Vector Store**: pgvector
- **Queue**: BullMQ + Redis
- **Auth**: Auth.js (NextAuth v5)
- **AI**: OpenAI (embeddings, synthesis)
- **Data Sources**: PubMed, arXiv, Semantic Scholar
- **UI**: Tailwind CSS, shadcn/ui
- **Charts**: Recharts

## Testing

The project uses **Vitest** with **React Testing Library** for unit and component tests.

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Test Suites

| Area | Files | Tests | Covers |
|------|-------|-------|--------|
| API routes | 13 | ~110 | Auth, claims CRUD, voting, evidence, research, admin, coins, health |
| Components | 13 | ~130 | Claim cards, evidence list, vote buttons, research progress, admin UI |
| Auth pages | 2 | 14 | Sign-in / sign-up flows, OAuth, error states |
| Libraries | 7 | ~90 | Chunker, rate-limit, prompts, env validation, vector search, PubMed, Semantic Scholar |
| Workers | 1 | 19 | Full RAG pipeline, error handling, verdict mapping |
| Pages | 3 | ~25 | Essential pages, loading skeletons, error boundaries |
| Middleware | 1 | 3 | Security headers |
| SEO | 1 | ~10 | Metadata, Open Graph |
| Seed | 1 | 9 | Seed data integrity |

**Total: 408 tests across 41 files**

### Writing Tests

- Test files live in `src/__tests__/` mirroring the source structure.
- Component tests use `@testing-library/react` with a `jsdom` environment.
- Global setup (`src/__tests__/setup.ts`) loads `@testing-library/jest-dom/vitest` matchers.
- Config lives in `vitest.config.ts` (path alias `@/` is pre-configured).

## Development Phases

- [x] **Phase 0**: Project foundation (auth, DB, deployment config)
- [x] **Phase 1 (Coin System)**: Auditable ledger, daily login, voting rewards, analysis unlock
- [x] **Phase 1 (Research)**: 10-step RAG pipeline — PubMed/arXiv/S2 search, chunking, embeddings, vector search, LLM evidence extraction & verdict synthesis
- [ ] **Phase 2**: Social sentiment & forecasting with pool betting
- [ ] **Phase 3**: Monetization & gating (Stripe)

## License

Proprietary - All rights reserved

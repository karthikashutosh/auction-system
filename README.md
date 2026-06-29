# Engineering Decisions

This project intentionally prioritizes correctness, scalability, and maintainability over implementing features as quickly as possible. The following sections explain the architectural decisions made throughout the application.

---

# Why Fastify?

Fastify was selected over Express because of its lightweight architecture, excellent TypeScript support, high throughput, and plugin-based design.

Benefits:

- Low request overhead
- Schema-based request validation
- Built-in serialization
- Excellent TypeScript experience
- Plugin encapsulation
- Better performance under high request loads

---

# Why PostgreSQL?

An online auction system requires strong consistency and transactional guarantees.

PostgreSQL provides:

- ACID transactions
- Row-level locking
- Foreign key constraints
- Advanced indexing
- JSON aggregation
- Window functions
- Complex joins

These capabilities are essential for preventing inconsistent auction states.

---

# Why Redis?

Redis serves two independent responsibilities.

## 1. Pub/Sub

Redis Pub/Sub broadcasts auction and notification events between services.

This allows API instances and workers to communicate without direct dependencies.

## 2. Background Processing

BullMQ uses Redis internally to schedule delayed jobs.

Examples:

- Auction expiration
- Winner notification
- Recovery jobs

Redis was selected because of its low latency and excellent support for distributed messaging.

---

# Why BullMQ?

Auction expiration should never depend on incoming user requests.

Instead of checking auction status whenever someone visits the page, delayed jobs automatically execute when the auction ends.

Advantages:

- Accurate execution timing
- Retry support
- Failure recovery
- Delayed execution
- Independent worker processes

---

# Why Server Sent Events Instead of WebSockets?

The application only requires server-to-client communication.

Clients never send messages through the persistent connection.

Therefore Server Sent Events were chosen because they provide:

- Native browser support
- Automatic reconnection
- Simpler infrastructure
- Lower resource usage
- HTTP compatible transport

If future requirements include chat or bidirectional communication, the architecture can evolve to WebSockets.

---

# Why Transactions?

Placing a bid updates multiple database records.

The following operations must succeed together:

- Validate auction status
- Validate bid amount
- Insert bid
- Update current price
- Update highest bidder

If any operation fails, every change must be rolled back.

Transactions guarantee database consistency.

---

# Why Row-Level Locking?

Two users may submit bids simultaneously.

Without locking:

```
User A reads current price
User B reads current price

Both place bids

Database becomes inconsistent
```

AuctionFlow prevents this using:

```sql
SELECT ...
FOR UPDATE
```

The first transaction acquires the lock.

The second transaction waits until the first completes.

This guarantees only one transaction updates the auction at a time.

---

# Why HttpOnly Cookies?

Authentication tokens are stored in HttpOnly cookies instead of Local Storage.

Benefits:

- Protected from JavaScript access
- Reduced XSS attack surface
- Automatic cookie handling
- Secure token storage

---

# Why Amazon S3 Presigned URLs?

Uploading images through the backend would require every file to pass through the API server.

Instead:

Browser
↓
Receive Presigned URL
↓
Upload directly to Amazon S3

Benefits:

- Reduced API bandwidth
- Lower server memory usage
- Stateless backend
- Better scalability

The backend only stores the generated S3 object key.

---

# Why a Monorepo?

The project uses Turborepo to manage multiple applications.

```
apps/
    web
    api
    worker

packages/
    database
    redis
    queue
    shared
```

Benefits:

- Shared validation schemas
- Shared database utilities
- Shared Redis configuration
- Shared TypeScript types
- Independent applications
- Simplified dependency management

---

# Request Lifecycle

## Create Auction

```
Browser
    │
    ▼
React Form
    │
Validation
    │
Upload Image to Amazon S3
    │
Receive Image Key
    │
POST /auctions
    │
Fastify Validation
    │
PostgreSQL Transaction
    │
Create Auction
    │
Schedule BullMQ Expiry Job
    │
Return Auction
```

---

## Place Bid

```
Client
    │
POST /bids
    │
Fastify
    │
Authentication
    │
Database Transaction
    │
SELECT ... FOR UPDATE
    │
Validate Auction
    │
Validate Bid Amount
    │
Insert Bid
    │
Update Auction Price
    │
Commit Transaction
    │
Publish Redis Event
    │
Server Sent Events
    │
Connected Clients Updated
```

---

## Auction Expiration

```
BullMQ Delay
     │
     ▼
Worker
     │
Begin Transaction
     │
Lock Auction
     │
Mark Auction Ended
     │
Determine Winner
     │
Create Notifications
     │
Publish Redis Event
     │
SSE Broadcast
```

---

# Scalability Considerations

The application has been designed to remain largely stateless.

Current architecture supports:

- Multiple API instances
- Independent workers
- Shared Redis messaging
- Shared PostgreSQL database
- Horizontal API scaling
- Stateless Docker containers

Images are stored externally in Amazon S3, allowing application containers to remain disposable.

---

# Production Considerations

Current production capabilities include:

- JWT Authentication
- Refresh Token Rotation
- Google OAuth
- Dockerized Services
- Background Workers
- Redis Pub/Sub
- PostgreSQL Transactions
- Database Migrations
- Automated CI/CD
- GitHub Container Registry
- Amazon EC2 Deployment
- Production Docker Compose

---

# CI/CD Pipeline

```
Developer

        │
git push origin main

        │
        ▼

GitHub Actions

        │
        ▼

Install Dependencies

        │
        ▼

Lint

        │
        ▼

Type Check

        │
        ▼

Tests

        │
        ▼

Build

        │
        ▼

Docker Build

        │
        ▼

Push Images to GHCR

        │
        ▼

SSH into EC2

        │
        ▼

git pull

        │
        ▼

docker compose pull

        │
        ▼

docker compose up

        │
        ▼

Application Updated
```

---

# Future Improvements

Potential enhancements include:

- WebSocket support for bidirectional communication
- Distributed rate limiting
- OpenTelemetry tracing
- Prometheus & Grafana monitoring
- Blue-Green deployments
- Immutable Docker image versioning
- Automatic rollback on failed deployments
- Read replicas for PostgreSQL
- Redis caching for frequently accessed auction data
- Kubernetes deployment
- CDN support for static assets

---

# Lessons Learned

Building AuctionFlow provided practical experience with:

- Designing transactional systems
- Preventing race conditions
- Building event-driven architectures
- Background job processing
- Real-time communication
- Cloud object storage
- Docker containerization
- CI/CD automation
- Production deployment
- Scalable monorepo architecture

The project emphasizes engineering trade-offs and production-oriented architecture rather than focusing solely on implementing features.

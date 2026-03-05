# Developer Console Platform
Metadata-Driven Multi-Tenant SaaS Platform

## Architecture Overview
A comprehensive low-code platform consisting of 6 runtime service clusters, 3 data stores, 2 async buses, and 1 CDN-fronted UI layer.

### Core Services
- **API Gateway** - Entry point for all tenant traffic
- **Auth Service** - JWT issuer/verifier with OAuth2 + SSO
- **Metadata Service** - Schema registry and cache-aside layer
- **Data Access Layer** - Dynamic SQL builder with RLS/FLS
- **Workflow Engine** - Event-driven automation engine
- **Builder BFF** - Backend-for-frontend for low-code builder
- **Console IDE BFF** - Developer console backend

### Data Stores
- **PostgreSQL 16** - Multi-schema tenant isolation
- **Redis 7 Cluster** - Cache, pub/sub, queues
- **Elasticsearch 8** - Full-text search

### Infrastructure
- **Kubernetes** - Container orchestration
- **NATS JetStream** - Event streaming
- **BullMQ** - Job queues
- **Prometheus + Grafana** - Observability

## Project Structure
```
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── metadata-service/
│   ├── data-access-layer/
│   ├── workflow-engine/
│   ├── builder-bff/
│   └── console-bff/
├── frontend/
│   ├── builder-ui/
│   └── console-ui/
├── infrastructure/
│   ├── helm-charts/
│   └── terraform/
└── docs/
```

## Development Setup
Each service is independently deployable with Docker and follows the same structure:
- TypeScript + Fastify
- TypeORM/Prisma for DB
- Jest for testing
- Dockerfile + CI pipeline

## Sprint Timeline
- **Weeks 1-3**: Metadata & Schema Engine
- **Weeks 2-4**: Data Access Layer  
- **Weeks 3-5**: API Gateway & Runtime
- **Weeks 1-4 + 9-10**: Identity, Auth & Access Control
- **Weeks 5-8**: Low-Code App Builder
- **Weeks 5-8**: Workflow & Automation Engine
- **Weeks 9-11**: Developer Console IDE
- **All Weeks**: Infrastructure, DevOps & Observability
- **Weeks 11-12**: Security & Compliance
- **Weeks 10-12**: Documentation, Testing & GA Release

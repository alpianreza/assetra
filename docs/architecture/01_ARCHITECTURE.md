# 01_ARCHITECTURE.md

- **Pattern**: Modular Monolith.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: NestJS, TypeScript, REST API (prefix `/api/v1`).
- **Database**: MySQL.
- **Deployment**: Single server (Reverse Proxy -> React Static / NestJS API).
- **Domains**: auth, users, roles, permissions, organization, areas, assets, inventory, compliance, checklists, notifications, reports, audit, settings.
- **IT Monitoring**: REMOVED.

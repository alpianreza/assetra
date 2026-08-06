# 09_FRONTEND_ARCHITECTURE.md

- **Structure**:
    - `src/app`: Routing/Main app setup.
    - `src/components`: Reusable UI components (shadcn/ui).
    - `src/features`: Domain-specific features (auth, inventory, compliance, reports, etc.).
    - `src/services`: API clients (TanStack Query).
    - `src/lib`: Shared utilities (Zod, Axios, etc.).
- **Validation**: Zod + React Hook Form (Frontend), Class Validator/Zod (Backend).
- **Removed**: Patrol and IT dashboards.

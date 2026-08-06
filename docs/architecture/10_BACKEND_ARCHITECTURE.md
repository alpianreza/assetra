# 10_BACKEND_ARCHITECTURE.md

- **Pattern**: Modular Monolith in NestJS.
- **Module Structure**:
    - `src/modules/{module-name}/`
    - Separations: `controller`, `service`, `repository` (or Prisma service), `dto`.
- **Validation**: Strict Zod/DTO validation.
- **Removed**: Patrol and IT modules.

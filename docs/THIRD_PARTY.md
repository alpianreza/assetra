# THIRD PARTY LICENSES

This document records the third-party foundations, libraries, and assets that
Assetra depends on. It is meant as a transparent record for compliance with
each upstream project.

> NOTE: This document is intentionally conservative. Where license information
> cannot be verified directly from the installed package or its official
> repository, the entry is marked **UNVERIFIED** and Assetra must not
> incorporate the source until a verified license is obtained.

---

## Verified Foundations

| Package / Project | Purpose             | License     | Source / Reference                              | Commercial Use | Modification |
| ----------------- | ------------------- | ----------- | ----------------------------------------------- | -------------- | ------------ |
| React             | UI Library          | MIT         | https://github.com/facebook/react               | Allowed        | Allowed      |
| Vite              | Frontend Bundler    | MIT         | https://github.com/vitejs/vite                  | Allowed        | Allowed      |
| Tailwind CSS      | CSS Framework       | MIT         | https://github.com/tailwindlabs/tailwindcss     | Allowed        | Allowed      |
| NestJS            | Backend Framework   | MIT         | https://github.com/nestjs/nest                  | Allowed        | Allowed      |
| Prisma            | ORM                 | Apache 2.0  | https://github.com/prisma/prisma                | Allowed        | Allowed      |
| TypeScript        | Language Compiler   | Apache 2.0  | https://github.com/microsoft/TypeScript         | Allowed        | Allowed      |
| TanStack Query    | Data fetching       | MIT         | https://github.com/TanStack/query               | Allowed        | Allowed      |
| TanStack Table    | Data table          | MIT         | https://github.com/TanStack/table               | Allowed        | Allowed      |
| React Router      | Routing             | MIT         | https://github.com/remix-run/react-router       | Allowed        | Allowed      |
| React Hook Form   | Form management     | MIT         | https://github.com/react-hook-form/react-hook-form | Allowed     | Allowed      |
| Zod               | Schema validation   | MIT         | https://github.com/colinhacks/zod               | Allowed        | Allowed      |
| clsx              | CSS class utils     | MIT         | https://github.com/lukeed/clsx                  | Allowed        | Allowed      |
| tailwind-merge    | Tailwind class merge| MIT         | https://github.com/dcastil/tailwind-merge       | Allowed        | Allowed      |
| helmet            | Security headers    | MIT         | https://github.com/helmetjs/helmet               | Allowed        | Allowed      |
| class-validator   | DTO validation      | MIT         | https://github.com/typestack/class-validator    | Allowed        | Allowed      |
| class-transformer | Object transformer  | MIT         | https://github.com/typestack/class-transformer  | Allowed        | Allowed      |

---

## TailwindAdmin / shadcn / Supplementary UI Templates

### TailwindAdmin React (TailAdmin / TailwindAdmin by TailAdmin)

- **Status:** UNVERIFIED
- **License:** UNVERIFIED
- **Commercial Use:** UNVERIFIED
- **Modification:** UNVERIFIED
- **Redistribution as part of Assetra:** UNVERIFIED
- **Source of license information:** none available locally

Assetra does NOT currently integrate TailwindAdmin source. The current
`apps/web/src/app/App.tsx`, `Layout.tsx`, and `DashboardPage.tsx` use only
plain Tailwind utility classes. Assetra ships a neutral application shell
that mimics a sidebar/dashboard layout; nothing from TailwindAdmin has been
copied. Until TailwindAdmin's license terms are reviewed and a redistribution
agreement is in place, Assetra will continue to use a neutral in-house shell.

### shadcn/ui

- **License:** MIT
- **Source:** https://github.com/shadcn-ui/ui
- **Commercial Use:** Allowed
- **Modification:** Allowed
- **Redistribution as part of Assetra:** Allowed (permissive MIT)
- **Integration status:** Not yet integrated in Prompt 02. Will be added
  incrementally in later prompts per design (`09_FRONTEND_ARCHITECTURE.md`).
# Auth & RBAC Implementation

Assetra uses a secure, session-based authentication system with no JWTs or Zustand state management.

## Authentication
- **Mechanism**: Server-side session with an `HttpOnly` authentication cookie.
- **Session Tokens**: Hashed using SHA-256 before storage in the database.
- **Password Hashing**: Argon2id is used for password hashing.
- **Login/Logout**: Explicit CSRF protection enforced for both login and logout.

## CSRF Protection
- **Strategy**: Double-Submit Cookie Pattern.
- **Implementation**:
    - Backend provides a CSRF token via `GET /api/v1/auth/csrf`.
    - Frontend sends the token in the `X-CSRF-Token` header for all mutation requests (POST, PUT, PATCH, DELETE).
    - `CsrfGuard` (globally registered) verifies that the `X-CSRF-Token` header matches the `assetra_csrf` cookie.

## RBAC & Session Management
- **Guards**: `SessionAuthGuard` (for auth), `PermissionsGuard` (for RBAC).
- **Audit Logs**: Events `LOGIN_SUCCESS`, `LOGIN_FAILED`, and `LOGOUT` are persisted to the `audit_logs` database table.
- **Rate Limit**: 10 requests per minute applied to the login endpoint.

## Automated Testing
- **Backend (E2E)**: `apps/api/test/auth.e2e.spec.ts` (12 tests)
- **Frontend**: `apps/web/src/features/auth/auth.test.tsx` (6 tests)

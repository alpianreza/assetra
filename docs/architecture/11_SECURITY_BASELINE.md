# 11_SECURITY_BASELINE.md

- **Auth**: Secure cookie-based authentication.
- **Hashing**: Argon2 or bcrypt.
- **Input**: Strict Zod/DTO validation.
- **CSRF**: CSRF tokens (even with same-origin cookies).
- **Uploads**: Strict MIME type validation (on server).
- **Audit**: Log all write actions.
- **Secrets**: `.env` management (never commit).

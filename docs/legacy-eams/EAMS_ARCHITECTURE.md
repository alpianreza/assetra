# EAMS ARCHITECTURE

- **Framework**: CodeIgniter 4
- **Language**: PHP 8.1+
- **Architecture**: MVC
- **Structure**:
    - `app/Controllers`: Business logic and request handling.
    - `app/Models`: Data access.
    - `app/Views`: Presentation layer.
    - `app/Helpers`: Business logic helpers (e.g., checklist calculation, access control).
    - `app/Filters`: Route middleware (Auth, Admin, Write).
    - `app/Commands`: Scheduled tasks.
    - `app/Libraries`: Reusable logic libraries.

- **Note**: CLAUDE.md mistakenly identifies this as a Laravel 12 application. This must be corrected in Assetra documentation.

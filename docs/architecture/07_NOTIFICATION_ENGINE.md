# 07_NOTIFICATION_ENGINE.md

- **Architecture**: Channel-agnostic Notification Service.
- **Channels**: WhatsApp (Provider Adapter: Fonnte), Email (SMTP Provider).
- **History**: Store delivery logs/history for admin review.
- **Logic**: Reminder Engine must understand session. Only warn for pending sessions.

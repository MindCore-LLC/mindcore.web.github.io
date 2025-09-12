# Privacy & Consent (Phase 1)

# Encryption & Locked Mode

Mindcore supports optional encryption at rest for sensitive memory fields.

- Field-level encryption: memory summaries (optional) and episode details can be encrypted.
- Passphrase: derived into a key using PBKDF2 (200k iters). The passphrase is not stored on disk.
- Envelopes:
  - v2 (default): AES-GCM with PBKDF2 salt+nonce per record.
  - v1/legacy: Fernet with PBKDF2-derived key.
- Locked mode: by default the daemon is locked; you must POST `/controls/unlock` with your passphrase to decrypt and view sensitive fields. Lock anytime via `/controls/lock`.

Environment variables:

- `MINDCORE_ENCRYPT_SUMMARY=true` to encrypt memory summaries on write
- `MINDCORE_PASSPHRASE=...` to enable encryption hooks during writes (for unattended/background); if not set, summaries remain clear. At read time, unlocking via API supplies the passphrase in-memory.

Threat model and security guidance live in `docs/THREAT_MODEL.md`.

- Privacy-safe mode default: only minimal metrics; no screenshots/audio/video.
- Per-sensor toggles: trackers can be disabled via `ConfigManager`.
- Allow/Deny lists: apps and paths that should be included/excluded.
- Local-only stance: remote_sync_enabled=false by default.
- Plan for encryption-at-rest: SQLCipher (passphrase-derived key) or OS DPAPI.

## Settings

- See `ConfigManager` in `packages/desktop-activity/src/core/config_manager.py` for privacy fields.
- Use env vars `MINDCORE_PRIVACY_SAFE`, `REMOTE_SYNC_ENABLED` if desired.

## Roadmap

- Implement SQLCipher-backed DB for memory store.
- Add onboarding flow for explicit consent.
- Add redaction policies per tracker.

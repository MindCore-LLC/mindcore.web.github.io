## MindCore Architecture (Expanded)

This document complements `COMPANION_LOOP.md` with deeper implementation detail.

### High-Level Layers

1. Capture Layer (Trackers / Sensors)
   - Desktop activity trackers (apps, files, web, clipboard, emotion, speech, system, etc.)
   - Each tracker produces raw events: `{source, type, ts, metadata, summary?, tags?}`
2. Ingestion Layer
   - HTTP (`/api/events/`) & Socket.IO event ingestion into Background Daemon
   - Backpressure queue (bounded) feeding proactive engine heuristics
3. Normalization & Memory Layer
   - Raw events → lightweight `Memory` (summary + embedding + tags)
   - Selected enriched events → `Episode` (details, salience, artifacts)
   - Vector index (FAISS / in‑memory) for episodic retrieval
4. Enrichment Jobs
   - Periodic or on-demand: daily & weekly summaries, entity+relationship extraction, emotion aggregation
   - PII redaction pre-index; optional payload encryption
5. Conversational Orchestrator
   - Dialogue state (history + scratchpad), mood model, personality and safety guard
   - Two-pass (plan → answer) + retrieval augmented prompt assembly
6. Proactive Engagement Engine
   - Time triggers, focus & anomaly heuristics, comfort policy & sensitivity modulation
   - Emits check-ins (Socket.IO) → persists as memories
7. Privacy, Consent & Transparency
   - Per-sensor consent log (auditable) with current effective status
   - Pause listening control, forget endpoints, transparency daily snapshot
   - Redaction (regex-based) + optional encryption hooks + local-first stance

### Data Flow Diagram (Narrative)

Tracker Event → (optional local pre-filter) → HTTP / Socket.IO → Ingest endpoint →
Consent Check → (if allowed) → Persist `Memory` + enqueue for Proactive Engine →
Heuristics may trigger Check-in → (LLM refine + safety) → Emit & store.

Batch jobs (daily/weekly/entity/emotion) scan Episodes → produce new enriched Episodes.

Chat request → Dialogue state update → Vector search (Memories/Episodes) → Plan → Answer → Safety self-check → Reflection Episode.

### Backpressure Strategy

The event queue in the Proactive Engine is bounded (`max_event_queue`). When full:

- Drop oldest (FIFO) before enqueueing new event (bounded memory, freshness prioritized)
- Metrics placeholder for future adaptive tuning

### Consent & Permission Model

- `consent_log` table records every grant/revoke: `{sensor, granted, ts, reason}`
- Current effective consent = last row per sensor.
- Ingest rejects (silently accepts but does not persist) events whose `source` lacks consent.
- API: `/api/permissions` (list), `/api/permissions/{sensor}` (update)

### Sensitivity Profile & Comfort Policy

- Sensitivity adjusts proactive engagement frequency.
- Profile fields: `engagement_level (low|medium|high)`, `max_checkins_override`, `min_minutes_between_checkins_override`.
- Applied dynamically to ComfortPolicy without restart.

### Encryption

- Passphrase-derived key (PBKDF2, 200k iters) for field encryption.
- Envelopes: v2 (AES-GCM) default; legacy v1 (Fernet) supported for backwards compatibility.
- Env flag `MINDCORE_ENCRYPT_SUMMARY` enables summary encryption; details are encrypted by default when a passphrase is provided.
- Locked mode: API endpoints `/controls/unlock` and `/controls/lock` control in-memory passphrase. Without unlocking, encrypted fields are not decrypted in responses.

### Future Enhancements (Roadmap)

- Streaming STT health & latency metrics
- Adaptive retention (salience + decay)
- User feedback loop for memory relevance scoring
- Differential privacy noise injection for analytics exports (if any remote mode is added)

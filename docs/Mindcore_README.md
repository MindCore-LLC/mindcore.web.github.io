
# Mindcore — AI Companion Platform (Developer Guide)

> **Purpose:** Mindcore is a local‑first AI companion that observes your desktop (apps, files, screen, mic/cam with consent), remembers your life as a private timeline, and chats with you using that memory. This README gives junior developers a clear picture of the architecture, how modules connect, and how to run/contribute to the MVP.

---

## 1) Big Picture

**Goal:** Build a _local_ AI best‑friend that can see context, remember, and talk naturally—without shipping your life to the cloud.

**Principles**
- **Local‑first & private:** data stays on your machine; encryption at rest; all sensors are opt‑in.
- **Modular:** each capability is a package; the app is assembled from small parts.
- **Event‑driven:** everything emits/consumes typed events (e.g., `activity.screen`, `memory.write`).
- **Composable memory:** timeline ➜ summaries ➜ embeddings ➜ retrieval for LLM.
- **Pluggable skills:** simple “skills”/plugins react to triggers and act through an SDK.

---

## 2) System Overview (Layers)

```
+-------------------+        +-------------------------------+
|   Desktop UI      | <----> |  Background Daemon (API/BUS) |
|  (Tauri/Electron) |        |  Orchestrates all modules     |
+-------------------+        +-------------------------------+
           ^                              ^
           |                              |
           v                              v
+------------------+             +--------------------------+
| Conversation &   |  <events>   |   Memory Store           |
| LLM Orchestrator | --------->  |  (SQLite + vector index) |
+------------------+             +--------------------------+
           ^                              ^
           |                              |
           v                              v
+------------------+             +--------------------------+
|  NLU / Context   |  <events>   |  Sensors & Perception    |
|  Engine          | <---------  |  (STT, TTS, Face, Activity,
+------------------+             |   Screen/Keyboard, etc.) |
                                 +--------------------------+
```

**Key idea:** Sensors create **events** ➜ Memory writes timeline ➜ Context + LLM retrieve relevant moments ➜ Companion replies via UI/TTS. The **Background Daemon** provides a local API and a lightweight event bus to connect everything.

---

## 3) Monorepo Structure

```
mindcore/
├─ apps/
│  ├─ desktop-ui/                # Chat, settings, permissions (Tauri/Electron + React)
│  ├─ background-daemon/         # Local API, event bus, orchestrator (FastAPI/Node)
│  └─ recorder/                  # Native capture for screen/keyboard/audio/video
│
├─ packages/
│  ├─ context-engine/            # State, persona, routines, reminders
│  ├─ llm-orchestrator/          # Tool routing, retrieval, prompt I/O, safety
│  ├─ nlu/                       # Intents/entities, sentiment, topic detection
│  ├─ stt/                       # Speech-to-text providers
│  ├─ tts/                       # Text-to-speech providers
│  ├─ perception/                # Face/emotion; mic/cam feature extraction
│  ├─ desktop-activity/          # App/file/window/screen tracking
│  ├─ avatar-engine/             # 2D/3D character + lipsync hooks
│  ├─ memory-store/              # SQLite timeline + embeddings (sqlite-vec / qdrant)
│  ├─ privacy/                   # Encryption, redaction, consent gates
│  ├─ integrations/              # Spotify/Discord/Calendar… (one subpkg per service)
│  ├─ plugin-api/                # Skill contract + loader
│  └─ sdk/                       # Typed client to call packages via the daemon
│
├─ resources/
│  ├─ schemas/                   # JSONSchema for events/memory
│  ├─ prompts/                   # Prompt templates, eval sets
│  └─ models/                    # Local models/checkpoints (git-lfs or .gitignored)
│
├─ infra/
│  ├─ scripts/                   # Dev scripts / dataset builders
│  ├─ docker/                    # Optional local vector DB, etc.
│  └─ ci/                        # Lint/Test/Build pipelines
│
├─ tests/                        # Cross-package integration tests
├─ docs/                         # MkDocs/Docusaurus site (user + dev docs)
└─ examples/                     # Minimal demos (hello companion)
```

---

## 4) How Modules Connect

### Communication
- **Local REST/gRPC** exposed by `apps/background-daemon`.
- **In‑process event bus** (simple pub/sub) for high‑frequency events.
- **`packages/sdk`** provides a single, typed client for all modules.

### Core Data Flow
1. **Sensors** emit events (e.g., `activity.windowChanged`, `audio.transcript`).
2. **privacy** filters/redacts per user settings.
3. **memory-store** writes compact timeline entries and creates embeddings.
4. **context-engine** maintains current context: “what’s happening now?”
5. **llm-orchestrator** retrieves relevant memories ➜ builds prompts ➜ calls LLM.
6. **desktop-ui** presents replies; **tts** can speak; **avatar-engine** animates.

---

## 5) Event & Memory Schemas (simplified)

**Event: screen activity**
```json
{
  "$schema": "resources/schemas/activity.screen.json",
  "type": "activity.screen",
  "ts": "2025-09-07T18:32:12Z",
  "app": "code",
  "window": "main.py — VS Code",
  "screenshot_path": "file:///.../shots/2025-09-07/183212.png",
  "text_hash": "sha256:..."
}
```

**Memory item**
```json
{
  "$schema": "resources/schemas/memory.item.json",
  "id": "mem_01H8...",
  "ts": "2025-09-07T18:32:13Z",
  "source_event": "activity.screen",
  "summary": "Editing main.py in VS Code on Mindcore repo",
  "tags": ["coding", "vs-code", "mindcore"],
  "embedding": [0.021, -0.14, ...]
}
```

**Conversation tool call (example)**
```json
{
  "tool": "memory.search",
  "query": "last time I worked on the context engine",
  "k": 8,
  "filters": {"tags": ["context-engine"]}
}
```

---

## 6) Running the MVP (Local)

### Prereqs
- **Python 3.11+**, **Node 20+**, **pnpm**, **uv** (or pip), **SQLite 3.44+**.
- macOS/Windows: grant screen/mic/camera permissions when prompted.

### Quick Start
```bash
# 1) install workspaces
pnpm i --filter "./apps/**" --filter "./packages/**"

# 2) Python deps
uv pip install -r apps/background-daemon/requirements.txt
uv pip install -r packages/*/requirements.txt

# 3) dev: start memory and daemon
just dev  # or: make dev
# …spawns background-daemon and hot-reloads packages

# 4) run UI
pnpm --filter desktop-ui dev
```

**First Run Checklist**
- Open **Desktop UI → Settings → Permissions** and toggle which sensors are allowed.
- Create a test conversation; verify that memories appear in the Timeline tab.
- Try voice chat: STT ➜ LLM ➜ TTS.

---

## 7) Building a Skill (Plugin)

**Skill contract (`packages/plugin-api`)**
```json
{
  "name": "daily_checkin",
  "triggers": ["time:08:00", "event:emotion.low"],
  "inputs_schema": { "type": "object", "properties": { "mood": {"type":"string"} } },
  "handler": "python:skills.daily_checkin:run"
}
```

**Register the skill**
```ts
// apps/background-daemon/register.ts
import { registerSkill } from "@mindcore/plugin-api";
import { dailyCheckin } from "@mindcore/skills/daily_checkin";
registerSkill(dailyCheckin);
```

**Skill handler (pseudo)**
```python
def run(ctx, inputs):
    last_sleep = ctx.memory.search("sleep hours last night", k=3)
    prompt = f"User reports mood {inputs['mood']}. Prior sleep: {last_sleep}"
    reply = ctx.llm.chat(prompt)
    ctx.ui.notify(reply)
```

---

## 8) Privacy Model (MUST READ)

- **Opt‑in sensors**: all off by default; granular toggles.
- **Encryption at rest**: AES‑GCM; keys in OS keychain.
- **Redaction**: credit cards, SSNs, faces in screenshots can be auto‑blurred.
- **Local‑only**: no cloud sync by default; optional backups are explicit.
- **Safe mode**: “Do not record” quick toggle + app/website blacklists.
- **Data export/delete**: one‑click “Wipe all memory” and per‑tag deletions.

---

## 9) Coding Conventions

- **Type‑safe boundaries**: pydantic (py) / zod (ts) with shared JSONSchemas.
- **Linters**: black/ruff (py), eslint/prettier (ts).
- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`…).
- **Tests**: unit inside each package; integration in `/tests` with a simulated user.
- **Docs**: every package has a `README.md` with its public API.

---

## 10) Roadmap (MVP ➜ Alpha)

**MVP (Weeks 1–4)**
- Desktop activity tracker → Memory store
- STT/TTS + basic chat in UI
- Retrieval‑augmented LLM with simple context rules
- Permissions panel + “Do not record”

**Alpha (Weeks 5–8)**
- Face presence + emotion signal
- Skills: daily check‑in, study timer, “nudge to break”
- Avatar with basic lipsync
- Data export + wipe

**Beta (Weeks 9–12)**
- Plugin marketplace (local registry)
- More integrations (Calendar, Discord, Spotify)
- Learning loop (personalization)
- Optional encrypted backup

---

## 11) Glossary

- **Event**: a single fact about something that happened (e.g., window changed).
- **Memory**: a summarized, searchable record derived from events.
- **Context**: the current situation estimate used to guide the assistant.
- **Skill**: a plugin that reacts to triggers and produces helpful actions.

---

## 12) Where to Start as a New Dev

1. **Run the quick start** and verify events → memories in the UI.  
2. Pick one package (e.g., `desktop-activity`) and read its README.  
3. Implement one **small skill** (e.g., “hydration nudge”) to learn the SDK.  
4. Add an integration test proving your skill writes a memory and shows a UI prompt.

> When in doubt: _make an event, write a memory, retrieve it for a good reply._

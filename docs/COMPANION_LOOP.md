# MindCore Companion Loop and Memory Taxonomy

## Companion Loop

Observe → Interpret → Store → Decide → Engage → Learn

- Observe: Desktop trackers, STT, perception feed events into the daemon.
- Interpret: Orchestrator classifies, summarizes, tags, embeds.
- Store: Persist to DB + update vector store.
- Decide: Trigger policies (check-ins, nudges, reminders) based on context.
- Engage: Chat/notifications via UI, Socket.IO.
- Learn: Update profiles, weights, and heuristics from outcomes.

```mermaid
design
flowchart LR
  A["Observe\n(trackers, stt, vision)"] --> B["Interpret\n(summarize, tag, embed)"]
  B --> C["Store\n(sqlite + faiss)"]
  C --> D["Decide\n(policies, triggers)"]
  D --> E["Engage\n(chat, notifications)"]
  E --> F["Learn\n(adapt personalization)"]
  F --> B
```

## Memory Taxonomy

- Episodic: time-stamped moments, e.g., "Edited Thesis.docx at 23:14" (source, summary, tags, embedding)
- Semantic: consolidated knowledge, e.g., "User prefers VS Code for Python"
- Emotional: mood states inferred from voice/vision, time-bounded
- Relational: entities and relationships, e.g., people, apps, projects
- Temporal anchors: routines, streaks, recurrence patterns

Schema notes

- Base fields: id, ts, source, summary, tags[], embedding[]
- Type-specific fields: kind (episodic|semantic|emotional|relational|temporal), payload json
- Derived indices: by time, by entity, by routine pattern

## Event → Memory Mapping

- Tracker events normalized to {source, type, summary, tags}
- Orchestrator enriches with context windows and emits memory candidates
- Deduplication windows (e.g., 5–10 minutes) collapse repetitive events

## Decision Policies (initial)

- Fatigue checks: prolonged focus → break suggestion
- Mood check-ins: sustained negative affect → gentle outreach
- Routine helpers: recurring time/app → suggest next step

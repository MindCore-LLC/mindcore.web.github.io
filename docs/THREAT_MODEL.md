## Threat Model (Baseline)

Scope: local-first AI companion running entirely on a user workstation.

### Assets

- Private timeline data (memories, episodes, artifacts)
- Live audio/screen/keyboard streams (when enabled)
- Secrets (LLM keys if any, plugin tokens)

### Adversaries

- Local attacker with user-level access (malware; shoulder-surfing)
- Prompt-injection adversary via retrieved content / tools
- Plugin authors (supply chain risk)

### Assumptions

- OS account integrity; disk encryption handled by OS if configured
- No remote server processing by default

### Risks & Mitigations

1. Local data exposure at rest

- Risk: SQLite DB and artifacts readable by other processes/users
- Mitigations: field-level encryption (AES-GCM v2); locked mode requires unlock to decrypt; optional OS keychain for passphrase storage (future)

2. In-process memory scraping

- Risk: malware exfiltrates in-memory passphrase
- Mitigations: unlocked state is opt-in and reversible; least time unlocked; potential future: secure enclave / DPAPI key wrapping

3. Prompt injection

- Risk: retrieved content injects instructions to the LLM
- Mitigations: SafetyGuard redaction + self-check; future: tool-use allowlist; content provenance flags; injection patterns filter

4. Plugin risk

- Risk: malicious or buggy plugins
- Mitigations: (planned) sandboxed subprocess with allowlisted APIs, constrained environment, resource/time limits, signed manifests

5. Exfiltration via logs

- Risk: sensitive data written to logs
- Mitigations: redact logs; avoid dumping payloads; rotate logs; allow disabling logs in prod

### Residual Risks

- If passphrase is weak or reused, brute force feasible. Encourage strong passphrases.
- While locked, encrypted fields remain opaque but metadata (timestamps, tags) can still leak patterns.

### Security Review Checklist

- [x] Field encryption present; decrypt-on-read gated by unlocked state
- [x] Locked/unlocked control endpoints
- [ ] Key rotation operational with re-encrypt
- [ ] Plugin sandbox boundary implemented

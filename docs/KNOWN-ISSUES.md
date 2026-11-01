# CHITHI — Known Issues & Mitigations

| Issue ID | Description | Impact | Mitigation Strategy | Status |
|---|---|---|---|---|
| **ISS-001** | Limited local CPU/RAM (Intel Core i7-10510U 4C/8T, 16GB) | Heavy Docker containers or simultaneous video transcoding workers can cause memory pressure | Run minimal services; optimize dev workers with concurrency=1; test media with small files | Active |
| **ISS-002** | E2EE is out of scope for v1 | Plain TLS used; data encrypted at rest in DB | Explicitly documented as TLS-in-transit + server-side authorization; no false E2EE claims | Resolved by Design |
| **ISS-003** | Transient network disconnects during chat | Client might duplicate messages upon retry | Enforce `client_message_id` unique constraint on messages table | Active |

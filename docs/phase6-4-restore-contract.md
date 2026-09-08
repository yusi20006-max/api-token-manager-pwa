# Phase 6.4 Restore Contract

Restore is filename-independent.

A selected file is accepted based on its JSON contents and supported backup structure. The filename is never used as part of validation.

Supported top-level record shapes remain:
- JSON array of API records
- `{ "apis": [...] }`
- `{ "tokens": [...] }`
- `{ "items": [...] }`
- `{ "data": [...] }`
- `{ "data": { "apis": [...] } }`
- `{ "data": { "tokens": [...] } }`
- `{ "data": { "items": [...] } }`

The browser file picker may advertise `.json` / `application/json`, but this is only a selection hint. Runtime validation parses the file contents and does not inspect the filename.

# Provider and Runtime Contract

## Provider adapter contract

Each provider adapter is responsible for:
- canonical base URL normalization;
- authentication header/query construction;
- model-listing request construction;
- explicitly declared provider endpoint paths;
- response normalization without leaking secrets.

The registry is the source of provider metadata and endpoint contracts; adapters are the source of request construction. Runtime endpoint requests never infer generic fallback paths.

## OrcaRouter

- Base URL: https://api.orcarouter.ai/v1
- Authentication: Authorization: Bearer <API_KEY>
- Model discovery: GET /models
- Chat: POST /chat/completions
- Responses: POST /responses
- The repository tests these paths with deterministic mocked HTTP fixtures. Required CI does not use live credentials.

## Google Gemini

- Authentication: x-goog-api-key: <API_KEY>
- The normal adapter and Smart Setup path do not put the key in the request URL.
- Query-string API keys are not the normal runtime contract.

## Smart Setup authentication evidence

Discovery and health are endpoint-specific evidence sources.

The result exposes:
- discovery authentication evidence;
- health authentication evidence;
- authentication source;
- authentication state.

If discovery and health disagree, the state is CONFLICTING_EVIDENCE; this must not be read as a single definitive authentication verdict.

## CORS boundary

Browser JavaScript cannot reliably prove that a rejected fetch was caused by CORS. Therefore:
- CORS_BLOCKED requires explicit observable evidence;
- browser-ambiguous fetch() failures remain NETWORK_ERROR;
- UI text must not claim that generic TypeError: Failed to fetch proves CORS.

See docs/CORS-ERROR-CONTRACT.md.

## Capability Matrix

The matrix is an evidence ledger, not an inference capability guarantee.

- SUPPORTED: evidence was obtained for the capability.
- UNSUPPORTED: evidence shows the capability is not supported.
- UNKNOWN: the application cannot establish the capability from current evidence.
- NOT_TESTED: the capability has not been probed.

A successful /models response does not prove chat, responses, embeddings, streaming, vision, or tools support.

## Reset and storage boundary

Reset clears only managed API/session state and leaves unrelated localStorage/sessionStorage state untouched. The reset UI invokes the storage boundary once.

## Service Worker cache policy

The Service Worker caches only declared same-origin static assets. Provider API requests and dynamic endpoints are network-only. Requests containing authentication material are never cacheable by the Service Worker.

This is required so health/discovery results cannot be replayed from stale application cache and so secrets cannot become persistent cache keys.

## Browser/PWA regression coverage

The browser suite verifies:
- application boot and UI event wiring;
- absence of inline onclick handlers;
- reset isolation;
- Service Worker activation;
- dynamic /models endpoint is not cached.

No external provider credential is required.

# Browser CORS and Network Error Contract

## Runtime boundary

A browser application's JavaScript cannot reliably distinguish a CORS policy failure from other transport failures such as DNS/TLS errors, offline state, firewall interference, or an unreachable host when fetch() rejects without an HTTP response.

The application therefore follows this rule:

- **CORS_BLOCKED** is reserved for explicit CORS evidence supplied by an integration or controlled test.
- **NETWORK_ERROR** is the runtime classification for browser-ambiguous fetch failures such as `TypeError: Failed to fetch`, `NetworkError`, or `load failed`.
- A successful HTTP response is classified from its status code and response body; it is not converted into a CORS error.
- The UI must not claim that a generic browser fetch failure has been proven to be CORS.

## Why this matters

The distinction is evidence-based. The application should not manufacture a more specific diagnosis than the browser exposes.

## Testing

Unit tests cover both explicit synthetic CORS evidence and ambiguous browser failures. The health-check engine also verifies that a browser-style rejected fetch remains `NETWORK_ERROR`.

## Scope

This contract does not prevent future provider-specific diagnostics from adding stronger evidence. Any such evidence must be explicitly observable and must not rely on assumptions about browser internals.

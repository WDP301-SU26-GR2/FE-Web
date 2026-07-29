# Transfer Public Series Pagination Design

## Problem

The Mangaka transfer loader requests `GET /public/series` with `limit=100`, while the OpenAPI contract permits a maximum of `50`. The backend therefore returns HTTP 422 before the transfer page can render.

## Design

Move public-series catalog loading into a focused Mangaka transfer helper. It requests the first page with `limit=50`, reads `total`, requests every remaining page with the same page size, and returns the flattened items. The transfer loader continues filtering the completed catalog to transfer-eligible lifecycle statuses.

## Error handling

Any failed page request rejects the helper and preserves the route loader's existing error-boundary behavior. No partial catalog is presented as complete.

## Verification

A Node test supplies a deterministic page loader, verifies the flattened catalog contains all items, and verifies every request uses `limit=50` with offsets `0`, `50`, and `100`.

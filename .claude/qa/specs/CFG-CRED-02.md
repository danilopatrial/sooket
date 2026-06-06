---
id: CFG-CRED-02
title: Create a new global credential with name, type, and secret
severity: high
source_files:
  - components/workflow-config/CredentialsTab.tsx
  - app/api/credentials/route.ts
---

## What this tests
Clicking "New" reveals a creation form; filling in name, type (from a fixed list), and secret value then clicking "Save" POSTs to the global credentials API (secret is AES-encrypted before storage) and adds the credential to the pool list.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Credentials tab

## Steps
1. Click the "New" button (with `Plus` icon) in the "Credentials Pool" section header
2. Observe the creation form that appears
3. Enter a name (e.g. "My API Key"), select a type from the dropdown, enter a secret value
4. Click "Save"
5. Observe the result

## Expected result
- "New" button toggles `showCreate`; form appears with: Name input, Type select (options: api-key, bearer-token, basic-auth, anthropic, openai, custom), Secret value input (type="password", monospace)
- "Save" button is disabled when name or key is empty
- On success: POSTs `{name, type, key}` to `/api/credentials`; the secret is encrypted server-side (`encrypt(key.trim(), SECRET)`); toast "Credential saved"; form collapses and resets; credential list refreshes
- Error: toast shows the API error message

## Failure indicators
- "New" button does not reveal the form
- The type dropdown is missing options or shows wrong values
- Save succeeds but the credential does not appear in the list
- "Save" button is not disabled when name/key is empty

## Severity rationale
Credentials must be created before they can be assigned to nodes; a broken create flow prevents any credential-based authentication.

## Source reference
`components/workflow-config/CredentialsTab.tsx` lines 31–38 — `CREDENTIAL_TYPES` array. Lines 87–108 — `handleCreate()` POSTs `{name, type, key}`, toasts, resets form, calls `loadAll()`. Lines 155–162 — "New" button toggles `showCreate`. Lines 165–213 — creation form with name, type select, password input, Save/Cancel buttons. `app/api/credentials/route.ts` lines 12–23 — POST: validates, encrypts with `encrypt(key.trim(), SECRET)`, calls `adapter.upsertCredential()`.

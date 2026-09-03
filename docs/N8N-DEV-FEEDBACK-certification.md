# n8n developers' feedback on certifying `@oneai-eu/n8n-nodes-oneai`

**Received from the owner 2026-09-03**, verbatim. This is the **authoritative** statement for our
package: where it and the public documentation disagree, this wins. Analysis lives beside it in
`N8N-DEV-FEEDBACK-analysis.md` — this file stays unedited.

---

# n8n node development

# 1.0 → Missing pairedItem in operation execute functions

Files: all operation files

Required action: Add pairedItem: { item: index } to all return statements. Replace return this.helpers.returnJsonArray(response) with:

```jsx
creturn this.helpers.returnJsonArray(response).map((item, index) => ({

...item,

pairedItem: { item: index },

}));
```

# 1.1 → Websocket functionality

Files: all files that use some sort of websockets

Required action: replace websocket endpoints with standard api calls

# 1.2 → Some endpoints use httpRequestWithAuthentication, while others use httpRequest

Files: all files that request a http API

Required action: replace every httpRequest with the new httpRequestWithAuthentation

---

*(28 lines as received. The stray `c` before `return` in the code block and the spelling
`httpRequestWithAuthentation` are in the original.)*

# Oli's guidance for the agent set

**Received from the owner 2026-09-03**, verbatim. Oli is our n8n app developer. This is
**authoritative** for how the agents are to work and for what belongs in the node — where it and the
public documentation disagree, this wins.

Companion to `N8N-DEV-FEEDBACK-certification.md` (the n8n developers' three certification items,
already fixed by Oli and passed on as information rather than as an open list).

---

N8n

* STRICTLY follow the types that are given in the openapi.json file, never use a casting to ANY and avoid using unknown as type.
* NEVER commit or push direct reviewable PRs to  github repository - always use draft PRs in English without Claude code additions 
* ALWAYS read the best-practice directly from the n8n repository that you can find here: n8n/packages/nodes-base/nodes at master · n8n-io/n8n Read it carefully, you don't have to scan through every project and read every project, but it is very useful to get a look at the best practices, since that base nodes are directly shipped by the n8n development team 
* oneAI is an AI platform, the node is supposed to be used with the API key, that starts with "oai_", as you can already see it in the code. Therefore, you don't have to implement any sign-in, sign-up, oauth etc. authentication. This node is supposed to be used alongside oneAI, that means that the user can perform the most important core functionalities in oneAI. For example: Chatting ( very important), Spaces, Datasets, Audit Logs. 
* After implementing a new function, ALWAYS go through the rest of the functions in our n8n node and check it against the openapi.json. Fix the types or request, if something has changed. It is very likely that request bodies get changed after an update 
* The Architect Agent should „think“ in the view of an n8n user / workflow developer and as that decide which oneai api endpoints need to be implemented in the n8n oneai app. For example: the oneData (dataset / tables) feature is one of the most important new features that need to be implemented. Why? Because with the hundreds of n8n nodes a workflow developer can connect to those apps, train their data and save them in a dataset directly through the oneai n8n node = extreme worthy feature to transfer data from other apps to oneai 

---

*(Verbatim as received, including the reference to `n8n/packages/nodes-base/nodes` at
`github.com/n8n-io/n8n`.)*

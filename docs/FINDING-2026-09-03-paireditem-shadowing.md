# 🔴 `pairedItem` is present everywhere and points at the wrong item

**Found 2026-09-03** while verifying the n8n developers' certification feedback. It was shipped in
the published `0.1.9`.

> 🟢 **CLOSED 2026-09-04.** Fixed across the whole surface and pinned by
> `scripts/paired-item-check.mjs`, which resolves scopes rather than matching text. The defect and
> the fix were both observed in a running n8n: with the defect restored in the built artefact, 20
> rows from 2 input items claimed descent from `{item:0}`…`{item:9}` — eight input items that did
> not exist. See `SESSION-HISTORY.md` § Session 0001 and pull request #2.
>
> 🔴 **One claim in this document did not survive re-measurement, and it matters.** §"Scope,
> measured" states that the three `pairedItem: { item: i }` occurrences are all in `actions/router.ts`
> and therefore correct. **Only one of them was.** The other two were in
> `compliancePattern/list.operation.ts`, where `i` is a `.map((item, i) => …)` callback parameter —
> the identical defect wearing a different variable name. A checker written from this document's
> account would have passed them. The paragraph is left standing rather than edited, because being
> able to see how a careful write-up was wrong is worth more than a tidy document: **re-measure what
> a document asserts before you build a check on it.**

Not one of the three items in `N8N-DEV-FEEDBACK-certification.md` — those are closed (see
`N8N-DEV-FEEDBACK-analysis` notes below). This is a fourth thing, found because the check for the
third one went one level deeper than the wording required.

---

## The defect

Every operation has this shape:

```ts
export async function execute(
	this: IExecuteFunctions,
	index: number,                      // ← the INPUT ITEM this call is for
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	// …
	return this.helpers.returnJsonArray(spaces).map((item, index) => ({
		//                                                   ^^^^^ SHADOWS the parameter
		...item,
		pairedItem: { item: index },     // ← position in the RESPONSE, not the input item
	}));
}
```

`actions/router.ts` loops over the input items and passes the position in:

```ts
const items = this.getInputData();
for (let i = 0; i < items.length; i++) {
	responseData = await space.list.execute.call(this, i);
}
```

so the outer `index` is the right value — and the `map` callback's own `index` parameter makes it
unreachable inside the closure.

### What that produces

Input item **3** returns ten rows. They are labelled `pairedItem: {item: 0}` … `{item: 9}` —
claiming to descend from ten different input items, most of which may not exist. The truthful
labelling is **ten times `{item: 3}`**: they all came from input item 3.

The single-input case is wrong too, only less visibly: one input item (0) returning ten rows still
labels them `{item: 0..9}`.

## Why it matters

`pairedItem` is n8n's data-lineage mechanism — which output row came from which input row. Downstream
it drives `$item()` expressions, the "linked items" panel, and the attribution of a failure to the
input row that caused it. A fabricated lineage does not fail loudly; it silently answers the wrong
question, and it points at input rows that may not exist.

## Scope, measured

| | |
|---|---|
| Operation files with an outer `index` parameter | **60** |
| …of those using `map((item, index)` — shadowed | **57** |
| Files in the **published** `0.1.9` `dist/` with the shadowed form | **65** |
| Occurrences of `pairedItem: { item: index }` in that `dist/` | **86** |
| Occurrences of `pairedItem: { item: i }` — a different variable | **3** |

🔴 **Those three are in `actions/router.ts`, not in operation files**, where `i` is the loop's own
variable over the input items and is therefore correct. So the truthful reading is not "the codebase
already knows the right shape in three places" — it is that **the router gets lineage right and
every operation gets it wrong**, which is why nothing downstream ever contradicted itself loudly
enough to be noticed.

## 🔴 The reason this belongs in the agent set, not just in a fix

**A rule that checks whether `pairedItem` is set passes on all 65 files.** The property that matters
is *`pairedItem` names the input item the row came from*, and that is not the same statement. Every
grep-shaped check — including the one that would naturally be written from the n8n feedback — is
green here.

That is the lesson to encode: **the validator must assert the intent, not the presence of a token.**

**And n8n's own snippet carries the same shadowing.** The email's example is

```js
return this.helpers.returnJsonArray(response).map((item, index) => ({
	...item,
	pairedItem: { item: index },
}));
```

which is right for one-input-item-to-one-output-item and wrong for an operation returning many rows
from one item — which is what most of ours do. This is not a criticism of n8n: it is illustrative
guidance, and we appear to have adopted it verbatim. It is a concrete reason for a rule the agents
should carry: **a snippet from an authority is evidence about a shape, not a licence to skip
reasoning about our own case.**

## Fix, when it is scheduled

Rename the callback's parameter so the outer one stays visible:

```ts
return this.helpers.returnJsonArray(spaces).map((item) => ({
	...item,
	pairedItem: { item: index },
}));
```

Mechanical across the affected files. Two things to settle first, neither of which is an agent's call:

1. **Verify the three `{ item: i }` sites** are correct rather than a different variant of the same
   mistake — the contrast is what makes the sweep safe.
2. **Is this a breaking change?** It alters lineage metadata, not payloads, so a workflow reading
   `.json` is unaffected. A workflow relying on `$item()` today is relying on a wrong answer. Per
   §3 of the research, node `version` is a plain number, so any release lands directly on
   `typeVersion: 1` in every existing workflow — the owner rules on whether that is acceptable here.

## How it would be pinned

A structural test that reads each operation file and asserts the `pairedItem` argument resolves to
the function's own item parameter and not to a shadowing binding. Falsifiable: reintroducing
`(item, index)` in one file must turn it red. That test is worth more than the fix, because the fix
is a one-off and the test is what stops the next contributor copying the snippet again.

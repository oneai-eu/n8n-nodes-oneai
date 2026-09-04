/**
 * Shapes for `POST /api/projects/bulk`, taken from `openapi/openapi.json` rather than from
 * prose. They are `type` aliases and not `interface`s for the reason given in
 * `dataset/helpers.ts`: an alias gets an implicit index signature, so a value of one of these
 * types is assignable to `IDataObject` and can be emitted without a cast.
 */

/** One entry of the response's `failed[]`: `required: [projectId, error]`. */
export type BulkActionFailure = {
	projectId: string;
	error: string;
};

/**
 * `{ succeeded: string[], failed: [{ projectId, error }] }`, both `required`.
 *
 * 🔴 The endpoint authorizes each id on its own and **reports** the ones it refused instead of
 * throwing, so an HTTP 200 does not mean the action happened. A response naming our project in
 * `failed[]` is a normal, expected outcome and has to reach the workflow as a failure.
 */
export type BulkActionResponse = {
	succeeded: string[];
	failed: BulkActionFailure[];
};

/** What `project:archive` and `project:unarchive` emit for the one project they were given. */
export type BulkActionOutcome = {
	projectId: string;
	action: 'archive' | 'unarchive';
	success: boolean;
	error: string | null;
};

/**
 * Reduce a bulk response for a single project id to that project's outcome.
 *
 * Success is asserted only when the id is actually listed in `succeeded`. Anything else -
 * an id in `failed[]`, or an id in neither list - is emitted as a failure with the reason the
 * API gave, because the one thing this must never do is turn a reported refusal into a row
 * that looks like it worked.
 */
export function bulkActionOutcome(
	projectId: string,
	action: 'archive' | 'unarchive',
	response: BulkActionResponse,
): BulkActionOutcome {
	const succeeded = Array.isArray(response.succeeded) ? response.succeeded : [];
	const failed = Array.isArray(response.failed) ? response.failed : [];

	const success = succeeded.includes(projectId);
	const failure = failed.find((entry) => entry.projectId === projectId) ?? null;

	return {
		projectId,
		action,
		success,
		error: success
			? null
			: (failure?.error ??
				'oneAI reported the project in neither succeeded nor failed, so the action cannot be assumed to have happened'),
	};
}

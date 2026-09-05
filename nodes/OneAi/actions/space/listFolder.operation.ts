import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * One entry of `items` in the `GET /api/spaces/{spaceId}/files/folder` response, transcribed from
 * the spec's schema rather than left as n8n's loose record type: only `isFolder`, `name` and
 * `path` are required, `fileCount` / `hasSubfolders` / `embeddingPriority` are folders-only, and
 * `embeddingPriority` is absent when the folder inherits its setting.
 *
 * A `type` alias and not an `interface` on purpose - a type alias gets an implicit index
 * signature, so it is assignable to that record type where an interface is not.
 */
type SpaceFolderEntry = {
	isFolder: boolean;
	name: string;
	path: string;
	size?: number;
	embeddingStatus?:
		| 'notEmbedded'
		| 'pending'
		| 'error'
		| 'badType'
		| 'tooLarge'
		| 'done'
		| 'patternExcluded';
	embeddingError?: string | null;
	modifiedAt?: string;
	fileCount?: number;
	hasSubfolders?: boolean;
	embeddingPriority?: 'high' | 'normal' | 'low';
};

/**
 * `GET /api/spaces/{spaceId}/files/folder` declares exactly two parameters, `spaceId` and
 * `folder`. There is no `page` or `pageSize`, so this operation deliberately ships **without**
 * Return All / Limit - a deviation from `space:listFiles` next door, because a limit control on an
 * endpoint that cannot paginate would be a lie about what the node does.
 *
 * `orgPagesExhausted` is a response-level flag and is carried onto every emitted row. The spec
 * calls it "org out of its monthly pages - pending vision-page files are queued for leftover
 * capacity", which is precisely the explanation for a `space:getFileStats` poll whose `pending`
 * never reaches zero. Dropping it to keep the row shape pure would delete the answer to the
 * question this family exists to answer. It cannot collide with an entry's own keys: the entry
 * schema is `additionalProperties: false` and does not contain it.
 *
 * Known limit: an empty folder emits zero items, so the flag is not observable in that case.
 * `space:getFileStats` is the fallback there.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['listFolder'],
			},
		},
	},
	{
		displayName: 'Folder Path',
		name: 'folder',
		type: 'string',
		default: '',
		placeholder: 'e.g. Inbox/',
		description: 'Folder path prefix to list. Leave empty to list the root of the space.',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['listFolder'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const folder = this.getNodeParameter('folder', index) as string;

	const qs: {
		folder?: string;
	} = {};

	if (folder) {
		qs.folder = folder;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/files/folder`,
		qs,
	});

	const entries = (response.items as SpaceFolderEntry[]) || [];
	const orgPagesExhausted = response.orgPagesExhausted as boolean;

	const rows = entries.map((entry) => ({ ...entry, orgPagesExhausted }));

	return this.helpers.returnJsonArray(rows).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}

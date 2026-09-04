import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { OneAiV1 } from './v1/OneAiV1';

/**
 * The oneAI node, as a `VersionedNodeType`.
 *
 * Why this wrapper exists, given it changes nothing today: the node declares `version: 1` as a
 * plain number, so every release lands directly on `typeVersion: 1` in every saved workflow —
 * and `getParameterIssues` never validates option membership, so a renamed parameter does
 * something different rather than failing. That made every breaking change either forbidden or
 * silent.
 *
 * With this in place a version 2 can be added beside version 1, exactly as n8n's own HTTP Request
 * node ships `1, 2, 3, 4, 4.1 … 4.5`. Existing workflows keep resolving to the implementation they
 * were built against, and a breaking change becomes affordable rather than unthinkable.
 *
 * 🔴 `nodeVersions` is a map with no fallback. A key that has ever been saved into a user's
 * workflow must stay in it for the life of the package.
 */
export class OneAi extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'oneAI',
			name: 'oneAi',
			icon: { light: 'file:oneai.svg', dark: 'file:oneai.dark.svg' },
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Interact with the oneAI API',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new OneAiV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}

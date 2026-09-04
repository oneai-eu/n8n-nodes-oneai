import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * The storage providers a space can have, as OneAI's API spells them.
 *
 * This list is shared by `space:create` (which sends `provider` in the body) and `space:list`
 * (which sends it as a query filter). Both used to offer `local`, `google`, `onedrive` and
 * `sharepoint`, none of which are in the enum the API accepts - four of the five values in the
 * filter were dead, and `create` could not succeed with any provider but GitHub.
 *
 * Neither drift tier catches this: tier 1 sees a path that still resolves, and tier 3 only
 * checks enum membership for string literals in the source. These values arrive from a node
 * parameter at runtime, so nothing mechanical was ever going to look at them.
 */
export const PROVIDER_OPTIONS: INodePropertyOptions[] = [
	{ name: 'ClickUp', value: 'clickUp' },
	{ name: 'Dynamics Sales', value: 'dynamicsSales' },
	{ name: 'Fireflies', value: 'fireflies' },
	{ name: 'Forgejo', value: 'forgejo' },
	{ name: 'GitHub', value: 'github' },
	{ name: 'Google Drive', value: 'googleDrive' },
	{ name: 'HTTP API', value: 'httpApi' },
	{ name: 'HubSpot', value: 'hubspot' },
	{ name: 'Lexoffice', value: 'lexoffice' },
	{ name: 'MCP', value: 'mcp' },
	{ name: 'N8N', value: 'n8n' },
	{ name: 'OneAI Storage', value: 'seaweed' },
	{ name: 'OneData (Data Tables)', value: 'oneData' },
	{ name: 'OneDrive or SharePoint', value: 'oneDrive' },
	{ name: 'OneGlue', value: 'oneglue' },
	{ name: 'Outlook', value: 'outlook' },
	{ name: 'Plytix', value: 'plytix' },
	{ name: 'Project', value: 'project' },
	{ name: 'SMB Share', value: 'smb' },
	{ name: 'Weclapp', value: 'weclapp' },
];

/**
 * The values this node used to offer, mapped onto the ones the API accepts.
 *
 * A workflow saved before this fix stores one of these strings, and n8n never validates that a
 * stored value is still one of the options - so without this map it would keep sending a dead
 * value silently. `sharepoint` maps to `oneDrive` because SharePoint drives are addressed
 * through that provider: its `driveId` is documented as "the ID of the OneDrive/SharePoint
 * drive".
 */
const LEGACY_PROVIDERS: Record<string, string> = {
	local: 'seaweed',
	google: 'googleDrive',
	onedrive: 'oneDrive',
	sharepoint: 'oneDrive',
};

/** Translate a stored provider value into one the API accepts. */
export function resolveProvider(provider: string): string {
	return LEGACY_PROVIDERS[provider] ?? provider;
}

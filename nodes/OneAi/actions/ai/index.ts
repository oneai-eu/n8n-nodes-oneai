import type { INodeProperties } from 'n8n-workflow';

import * as createEmbedding from './createEmbedding.operation';
import * as createResponse from './createResponse.operation';
import * as editImage from './editImage.operation';
import * as generateImage from './generateImage.operation';
import * as generateSpeech from './generateSpeech.operation';
import * as listImageModels from './listImageModels.operation';
import * as listModels from './listModels.operation';
import * as transcribeAudio from './transcribeAudio.operation';

export {
	createEmbedding,
	createResponse,
	editImage,
	generateImage,
	generateSpeech,
	listImageModels,
	listModels,
	transcribeAudio,
};

export const description: INodeProperties[] = [
	...createEmbedding.description,
	...createResponse.description,
	...editImage.description,
	...generateImage.description,
	...generateSpeech.description,
	...listImageModels.description,
	...listModels.description,
	...transcribeAudio.description,
];

import { z } from 'zod';

export const parseSerialSchema = z.object({
	functionName: z.literal('parseSerial'),
	args: z.tuple([z.string()])
});

export const parseBytesSchema = z.object({
	functionName: z.literal('parseBytes'),
	args: z.tuple([z.instanceof(Uint8Array), z.boolean().optional()])
});

export const encodeSerialSchema = z.object({
	functionName: z.literal('encodeSerial'),
	args: z.tuple([z.array(z.any())])
});

export const writeVarintSchema = z.object({
	functionName: z.literal('writeVarint'),
	args: z.tuple([z.any(), z.number()])
});

export const writeVarbitSchema = z.object({
	functionName: z.literal('writeVarbit'),
	args: z.tuple([z.any(), z.number()])
});

export const toCustomFormatSchema = z.object({
	functionName: z.literal('toCustomFormat'),
	args: z.tuple([
		z.array(z.any()),
		z.boolean().optional(),
		z.record(z.string(), z.string()).optional(),
		z.record(z.string(), z.string()).optional(),
		z.record(z.string(), z.string()).optional(),
		z.string().optional()
	])
});

export const customFormatToSerialSchema = z.object({
	functionName: z.literal('customFormatToSerial'),
	args: z.tuple([z.any()])
});

export const getInitialStateSchema = z.object({
	functionName: z.literal('getInitialState'),
	args: z.tuple([])
});

export const appendRandomAssetSchema = z.object({
	functionName: z.literal('appendRandomAsset'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const injectRepeatingPartSchema = z.object({
	functionName: z.literal('injectRepeatingPart'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const scrambleAndAppendFromRepoSchema = z.object({
	functionName: z.literal('scrambleAndAppendFromRepo'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const injectRepeatingPartFullSchema = z.object({
	functionName: z.literal('injectRepeatingPartFull'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const injectRandomAssetSchema = z.object({
	functionName: z.literal('injectRandomAsset'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const reverseRandomSegmentsSchema = z.object({
	functionName: z.literal('reverseRandomSegments'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const injectHighValuePartSchema = z.object({
	functionName: z.literal('injectHighValuePart'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const crossoverWithRepositorySchema = z.object({
	functionName: z.literal('crossoverWithRepository'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const shuffleAssetsSchema = z.object({
	functionName: z.literal('shuffleAssets'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const randomizeAssetsSchema = z.object({
	functionName: z.literal('randomizeAssets'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const repeatHighValuePartSchema = z.object({
	functionName: z.literal('repeatHighValuePart'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const appendHighValuePartSchema = z.object({
	functionName: z.literal('appendHighValuePart'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const appendSelectedAssetMutationSchema = z.object({
	functionName: z.literal('appendSelectedAssetMutation'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const repeatSelectedAssetMutationSchema = z.object({
	functionName: z.literal('repeatSelectedAssetMutation'),
	args: z.tuple([z.array(z.any()), z.any()])
});

export const mergeSerialSchema = z.object({
	functionName: z.literal('mergeSerial'),
	args: z.tuple([z.string(), z.string()])
});

export const mergeSerialsSchema = z.object({
	functionName: z.literal('mergeSerials'),
	args: z.tuple([z.string(), z.array(z.string())])
});

export const operationSchema = z.union([
	parseSerialSchema,
	parseBytesSchema,
	encodeSerialSchema,
	writeVarintSchema,
	writeVarbitSchema,
	toCustomFormatSchema,
	customFormatToSerialSchema,
	getInitialStateSchema,
	appendRandomAssetSchema,
	injectRepeatingPartSchema,
	scrambleAndAppendFromRepoSchema,
	injectRepeatingPartFullSchema,
	injectRandomAssetSchema,
	reverseRandomSegmentsSchema,
	injectHighValuePartSchema,
	crossoverWithRepositorySchema,
	shuffleAssetsSchema,
	randomizeAssetsSchema,
	repeatHighValuePartSchema,
	appendHighValuePartSchema,
	appendSelectedAssetMutationSchema,
	repeatSelectedAssetMutationSchema,
	mergeSerialSchema,
	mergeSerialsSchema
]);

export const batchOperationSchema = z.array(operationSchema);

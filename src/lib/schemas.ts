import { z } from 'zod';

export const parseSerialSchema = z.object({
	functionName: z.literal('parseSerial'),
	args: z.tuple([z.string()])
});

export const encodeSerialSchema = z.object({
	functionName: z.literal('encodeSerial'),
	args: z.tuple([z.array(z.any())])
});

export const serialToCustomFormatSchema = z.object({
	functionName: z.literal('serialToCustomFormat'),
	args: z.tuple([z.string()])
});

export const customFormatToSerialSchema = z.object({
	functionName: z.literal('customFormatToSerial'),
	args: z.tuple([z.any()])
});

export const base85ToDeserializedSchema = z.object({
	functionName: z.literal('base85_to_deserialized'),
	args: z.tuple([z.string()])
});

export const deserializedToBase85Schema = z.object({
	functionName: z.literal('deserialized_to_base85'),
	args: z.tuple([z.string()])
});

export const operationSchema = z.union([
	parseSerialSchema,
	encodeSerialSchema,
	base85ToDeserializedSchema,
	deserializedToBase85Schema,
	serialToCustomFormatSchema,
	customFormatToSerialSchema
]);

export const batchOperationSchema = z.array(operationSchema);
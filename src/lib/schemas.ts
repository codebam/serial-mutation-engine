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

export const operationSchema = z.union([
	parseSerialSchema,
	encodeSerialSchema,
	serialToCustomFormatSchema,
	customFormatToSerialSchema
]);

export const batchOperationSchema = z.array(operationSchema);

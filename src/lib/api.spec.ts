import { describe, it, expect } from 'vitest';
import * as api from './api';
import { operationSchema } from './schemas';

describe('API and Schema Correspondence', () => {
	it('should have a schema for every exported API function', () => {
		const apiFunctions = Object.keys(api).filter((key) => typeof api[key as keyof typeof api] === 'function');

		const schemaFunctions = operationSchema.options.map(
			(schema: any) => schema.shape.functionName.value
		);

		expect(apiFunctions.sort()).toEqual(schemaFunctions.sort());
	});
});

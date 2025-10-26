import { parse } from 'comment-parser';

export async function load() {
	const modules = import.meta.glob(
		[
			'../api/+server.ts',
			'../../lib/parser.ts',
			'../../lib/encoder.ts',
			'../../lib/custom_parser.ts',
			'../../lib/types.ts'
		],
		{ query: '?raw', import: 'default' }
	);

	const allComments = [];

	for (const modulePath in modules) {
		const fileContent = (await modules[modulePath]()) as string;
		const parsedComments = parse(fileContent);
		allComments.push(...parsedComments);
	}

	return {
		comments: allComments
	};
}

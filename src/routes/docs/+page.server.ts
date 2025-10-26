import { parse } from 'comment-parser';

export async function load() {
	const modules = import.meta.glob('../api/+server.ts', { query: '?raw', import: 'default' });
	const fileContent = (await modules['../api/+server.ts']()) as string;
	const parsedComments = parse(fileContent);

	return {
		comments: parsedComments
	};
}

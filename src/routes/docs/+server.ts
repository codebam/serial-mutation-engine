import { json } from '@sveltejs/kit';
import * as fs from 'fs';
import { parse } from 'comment-parser';

export async function GET() {
	const filesToParse = [
		'src/routes/api/+server.ts',
		'src/lib/parser.ts',
		'src/lib/encoder.ts',
		'src/lib/custom_parser.ts',
		'src/lib/types.ts'
	];

	const allComments = await Promise.all(
		filesToParse.map(async (filePath) => {
			const content = fs.readFileSync(filePath, 'utf-8');
			return parse(content);
		})
	);

	return json({ comments: allComments.flat() });
}
#!/usr/bin/env node
import { base85_to_deserialized, deserialized_to_base85 } from './custom_parser.js';

const args = process.argv.slice(2);

function getInput(callback: (data: string) => void) {
	if (process.stdin.isTTY) {
		const flagIndex = args.findIndex((arg) => arg === '-d' || arg === '-e');
		if (flagIndex !== -1 && args[flagIndex + 1]) {
			callback(args[flagIndex + 1]);
		} else {
			console.error('Usage: npx @codebam/u-serial [-d|-e] "string"');
			process.exit(1);
		}
	} else {
		let data = '';
		process.stdin.on('data', (chunk) => {
			data += chunk;
		});
		process.stdin.on('end', () => {
			callback(data.trim());
		});
	}
}

async function run() {
	const decodeFlag = args.includes('-d');
	const encodeFlag = args.includes('-e');

	if (decodeFlag) {
		getInput(async (input) => {
			try {
				const deserialized = await base85_to_deserialized(input);
				console.log(deserialized);
			} catch (error) {
				console.error('Error decoding:', (error as Error).message);
				process.exit(1);
			}
		});
	} else if (encodeFlag) {
		getInput((input) => {
			try {
				const serial = deserialized_to_base85(input);
				console.log(serial);
			} catch (error) {
				console.error('Error encoding:', (error as Error).message);
				process.exit(1);
			}
		});
	} else {
		// Default to decode if no flag is provided
		getInput(async (input) => {
			try {
				const deserialized = await base85_to_deserialized(input);
				console.log(deserialized);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (error) {
				// if decoding fails, try encoding
				try {
					const serial = deserialized_to_base85(input);
					console.log(serial);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				} catch (error2) {
					console.error('Could not determine operation. Please use -d to decode or -e to encode.');
					process.exit(1);
				}
			}
		});
	}
}

run();

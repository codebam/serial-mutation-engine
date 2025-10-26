#!/usr/bin/env node
import { base85_to_deserialized, deserialized_to_base85 } from './custom_parser.ts';
import packageJson from '../../package.json' with { type: 'json' };
const { version } = packageJson;

const args = process.argv.slice(2);

const helpMessage = `
Usage: npx @codebam/u-serial [options] "[string]"

Version: ${version}

Options:
  -d, --decode       Decode a serial.
  -e, --encode       Encode a serial.
  --json             Output decoded serial as JSON.
  --version          Show version number.
  -h, --help         Show help.
`;

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
	console.log(helpMessage);
	process.exit(0);
}

if (args.includes('--version')) {
	console.log(version);
	process.exit(0);
}

function getInput(callback: (data: string) => void) {
	if (process.stdin.isTTY) {
		const flagIndex = args.findIndex((arg) => arg === '-d' || arg === '-e' || arg === '--decode' || arg === '--encode');
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
	const decodeFlag = args.includes('-d') || args.includes('--decode');
	const encodeFlag = args.includes('-e') || args.includes('--encode');
	const jsonFlag = args.includes('--json');

	if (decodeFlag) {
		getInput(async (input) => {
			try {
				const deserialized = await base85_to_deserialized(input);
				if (jsonFlag) {
					console.log(JSON.stringify(deserialized, null, 2));
				} else {
					console.log(deserialized);
				}
			} catch (error) {
				console.error('Error decoding:', (error as Error).message);
				process.exit(1);
			}
		});
	} else if (encodeFlag) {
		getInput(async (input) => {
			try {
				const serial = await deserialized_to_base85(input);
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
				if (jsonFlag) {
					console.log(JSON.stringify(deserialized, null, 2));
				} else {
					console.log(deserialized);
				}
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (error) {
				// if decoding fails, try encoding
				try {
					const serial = await deserialized_to_base85(input);
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

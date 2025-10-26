const api_url = 'https://serial-mutation-engine.pages.dev/api';
// const api_url = "http://localhost:5173/api";
import * as fs from 'fs';
import * as readline from 'readline';

async function batchOperations() {
	const fileStream = fs.createReadStream('/home/codebam/Downloads/serials.txt');

	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity // Handle all instances of CR LF ('\r\n') as a single line break.
	});

	const payload = [];

	let first = true;
	for await (const line of rl) {
		const operation = { content: line, action: 'decode' };
		if (first) {
			operation.debug = true;
			first = false;
		}
		payload.push(operation);
	}

	const batch_payload = payload.slice(0, 11000);

	console.log(`Sending ${batch_payload.length} serials...`);
	// console.log("Payload to be sent:", batch_payload);

	try {
		const response = await fetch(api_url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(batch_payload),
			cache: 'no-store' // Add this line to prevent caching
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const executionTime = response.headers.get('X-Execution-Time');
		const data = await response.json();
		console.log('Batch Results:', data);

		console.log("Number of Serials: ", batch_payload.length);
		if (executionTime) {
			console.log('API Execution Time:', executionTime);
		} else {
			console.log('X-Execution-Time header not found.');
		}
	} catch (error) {
		console.error('Error during fetch:', error);
	}
}

batchOperations();

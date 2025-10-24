export function calculateHighValuePartsStats(
	serials: string[],
	minPartSize: number,
	maxPartSize: number,
	onProgress: (progress: number) => void,
	debugMode: boolean
) {
	if (onProgress) onProgress(0);
	if (debugMode) console.log('[DEBUG] Starting high-value part stats calculation...');

	const tails = serials;
	const frequencyMap = new Map();
	const totalSerials = tails.length;

	for (let i = 0; i < totalSerials; i++) {
		const tail = tails[i];
		const seenSubstrings = new Set();
		for (let len = minPartSize; len <= maxPartSize; len++) {
			for (let j = 0; j <= tail.length - len; j++) {
				const substring = tail.substring(j, j + len);
				seenSubstrings.add(substring);
			}
		}
		for (const substring of seenSubstrings) {
			frequencyMap.set(substring, (frequencyMap.get(substring) || 0) + 1);
		}
		if (onProgress) {
			onProgress(((i + 1) / totalSerials) * 100);
		}
	}

	// 4. Filter and consolidate the results
	let parts = [...frequencyMap.entries()].filter(([, count]) => count > 1).map(([part]) => part);

	let changed = true;
	while (changed) {
		changed = false;
		const consolidated = new Set<string>();
		parts.sort((a, b) => b.length - a.length);

		for (const part of parts) {
			let isContained = false;
			for (const biggerPart of consolidated) {
				if (biggerPart.includes(part)) {
					isContained = true;
					break;
				}
			}
			if (!isContained) {
				consolidated.add(part);
			}
		}

		if (consolidated.size !== parts.length) {
			parts = [...consolidated];
			changed = true;
		}
	}

	const finalParts = new Map();
	for (const part of parts) {
		finalParts.set(part, frequencyMap.get(part));
	}

	if (debugMode) console.log(`[DEBUG] Found ${finalParts.size} unique high-value parts.`);

	if (onProgress) onProgress(100);

	return [...finalParts.entries()];
}

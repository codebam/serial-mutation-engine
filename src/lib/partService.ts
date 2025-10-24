import { parsePartString } from './custom_parser';
import { TOK_PART, TOK_VARINT, type Serial, type PartInfo, type Part } from './types';
import { GetKindEnums, kindToString } from './item-type-lookup';

export class PartService {
	worker: Worker;
	allParts: PartInfo[] = [];
	partMap = new Map<string, PartInfo>();

	isDataLoaded = false;

	constructor(worker: Worker) {
		this.worker = worker;
	}

	loadPartData() {
		return new Promise<void>((resolve) => {
			this.worker.addEventListener('message', (e) => {
				const { type, payload } = e.data;
				const partMap = new Map<string, PartInfo>();
				if (type === 'part_data_loaded') {
					this.allParts = [];
					this.partMap = new Map<string, PartInfo>();

					for (const rawPart of payload.rawParts) {
						const partBlock = parsePartString(rawPart.universalPart);
						if (partBlock && partBlock.part) {
							const key = JSON.stringify(partBlock.part);
							const partInfo: PartInfo = {
								name: rawPart.name,
								subType: partBlock.part.subType,
								index: partBlock.part.index,
								fileName: rawPart.fileName,
								code: rawPart.universalPart
							};
							if (partBlock.part.value !== undefined) {
								partInfo.value = partBlock.part.value;
							}
							if (partBlock.part.values !== undefined) {
								partInfo.values = partBlock.part.values;
							}
							this.partMap.set(key, partInfo);
						}
					}
					this.allParts = Array.from(this.partMap.values());
					// Sort allParts here
					this.allParts.sort((a, b) => {
						if (a.name && b.name) {
							return a.name.localeCompare(b.name);
						}
						return 0;
					});

					this.isDataLoaded = true;
					console.log('Manual lookup for {1:12}:', this.partMap.get(JSON.stringify({ subType: 1, index: 12 })) );
					resolve();
				}
			});
			this.worker.postMessage({ type: 'load_part_data' });
		});
	}

	findPartInfo(part: Part): PartInfo | undefined {
		let key;
		if (part.subType === 1 && part.value !== undefined) {
			// For SUBTYPE_INT, the index from the part becomes the subType in the key,
			// and the value from the part becomes the index in the key.
			key = JSON.stringify({ subType: part.index, index: part.value });
		} else {
			key = JSON.stringify({ subType: part.subType, index: part.index });
		}
		return this.partMap.get(key);
	}

	getParts(itemType: string): PartInfo[] {
		if (itemType === 'UNKNOWN') return [];
		if (itemType.includes('Weapon'))
			return this.allParts.filter(
				(p) =>
					!p.fileName.includes('_mods') &&
					!p.fileName.includes('_shields') &&
					!p.fileName.includes('_repkits') &&
					!p.fileName.includes('_grenades')
			);
		if (itemType === 'Vex Class Mod')
			return this.allParts.filter((p) => p.fileName === 'vex_class_mods');
		if (itemType === 'Rafa Class Mod')
			return this.allParts.filter((p) => p.fileName === 'rafa_class_mods');
		if (itemType === 'Harlowe Class Mod')
			return this.allParts.filter((p) => p.fileName === 'harlowe_class_mods');
		if (itemType === 'Heavy Ordnance')
			return this.allParts.filter((p) => p.fileName === 'heavy_ordnance_firmware');
		if (itemType === 'Shield') return this.allParts.filter((p) => p.fileName.includes('_shields'));
		if (itemType === 'Repkit') return this.allParts.filter((p) => p.fileName.includes('_repkits'));
		if (itemType === 'Grenade')
			return this.allParts.filter((p) => p.fileName.includes('_grenades'));
		return this.allParts;
	}

	getItemTypeProperties(id: number): { first: string; second: string } | null {
		const [first, second, found] = GetKindEnums(id);
		if (found) {
			return {
				first: kindToString(first),
				second: kindToString(second)
			};
		}
		return null;
	}

	determineItemType(parsed: Serial): string {
		if (!parsed || parsed.length === 0) {
			return 'Unknown';
		}

		const firstBlock = parsed[0];
		if (firstBlock.token === TOK_VARINT) {
			if (firstBlock.value !== undefined) {
				const itemTypeProps = this.getItemTypeProperties(firstBlock.value);
				if (itemTypeProps) {
					if (itemTypeProps.second === 'Class Mod') {
						return `${itemTypeProps.first} ${itemTypeProps.second}`;
					}
					const weaponTypes = [
						'Pistol',
						'Shotgun',
						'SMG',
						'Sniper',
						'Assault Rifle',
						'Heavy Weapon'
					];
					if (weaponTypes.includes(itemTypeProps.second)) {
						return `${itemTypeProps.first} ${itemTypeProps.second} (Weapon)`;
					}
					return `${itemTypeProps.first} ${itemTypeProps.second}`;
				}
			}
		}

		if (parsed.some((b) => b.token === TOK_PART && b.part && b.part.subType === 244)) {
			return 'Heavy Ordnance';
		}
		if (
			parsed.some(
				(b) =>
					b.token === TOK_PART &&
					b.part &&
					(b.part.subType === 246 || b.part.subType === 248 || b.part.subType === 237)
			)
		) {
			return 'Shield';
		}
		if (parsed.some((b) => b.token === TOK_PART && b.part && b.part.subType === 243)) {
			return 'Repkit';
		}
		if (parsed.some((b) => b.token === TOK_PART && b.part && b.part.subType === 245)) {
			return 'Grenade';
		}

		return 'Unknown'; // Default to unknown
	}
}

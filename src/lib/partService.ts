import { parsePartString } from './custom_parser';
import { SUBTYPE_INT, SUBTYPE_LIST, TOK_PART } from './types';
import { toCustomFormat } from './custom_parser';
export class PartService {
    worker: Worker;
    allParts = [];
    partMap = new Map();

    isDataLoaded = false;

    constructor(worker: Worker) {
        this.worker = worker;
    }

    loadPartData() {
        return new Promise<void>((resolve) => {
            this.worker.addEventListener('message', (e) => {
                const { type, payload } = e.data;
                if (type === 'part_data_loaded') {
                    this.allParts = [];
                    this.partMap = new Map();

                    for (const rawPart of payload.rawParts) {
                        const partBlock = parsePartString(rawPart.universalPart);
                        if (partBlock && partBlock.part) {
                            const partInfo: any = {
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

                            this.allParts.push(partInfo);
                            const key = `${partInfo.subType}:${partInfo.index}:${partInfo.value}`;
                            this.partMap.set(key, partInfo);
                        }
                    }
                    // Sort allParts here
                    this.allParts.sort((a, b) => {
                        if (a.name && b.name) {
                            return a.name.localeCompare(b.name);
                        }
                        return 0;
                    });

                    this.isDataLoaded = true;
                    console.log('Manual lookup for {1:12}:', this.partMap.get('1:1:12'));
                    resolve();
                }
            });
            this.worker.postMessage({ type: 'load_part_data' });
        });
    }

    findPartInfo(part) {
        const key = `${part.subType}:${part.index}:${part.value}`;
        return this.partMap.get(key);
    }

    getParts(itemType) {
        if (itemType === 'UNKNOWN') return [];
        if (itemType === 'WEAPON') return this.allParts.filter(p => !p.fileName.includes('_mods') && !p.fileName.includes('_shields') && !p.fileName.includes('_repkits') && !p.fileName.includes('_grenades'));
        if (itemType === 'VEX_CLASS_MOD') return this.allParts.filter(p => p.fileName === 'vex_class_mods');
        if (itemType === 'RAFA_CLASS_MOD') return this.allParts.filter(p => p.fileName === 'rafa_class_mods');
        if (itemType === 'HARLOWE_CLASS_MOD') return this.allParts.filter(p => p.fileName === 'harlowe_class_mods');
        if (itemType === 'HEAVY_ORDNANCE') return this.allParts.filter(p => p.fileName === 'heavy_ordnance_firmware');
        if (itemType === 'SHIELD') return this.allParts.filter(p => p.fileName.includes('_shields'));
        if (itemType === 'REPKIT') return this.allParts.filter(p => p.fileName.includes('_repkits'));
        if (itemType === 'GRENADE') return this.allParts.filter(p => p.fileName.includes('_grenades'));
        return this.allParts;
    }
}

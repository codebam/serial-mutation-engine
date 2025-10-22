export class PartService {
    worker: Worker;
    allParts = [];
    partMap = new Map();

    constructor(worker: Worker) {
        this.worker = worker;
    }

    loadPartData() {
        return new Promise<void>((resolve) => {
            this.worker.addEventListener('message', (e) => {
                const { type, payload } = e.data;
                if (type === 'part_data_loaded') {
                    this.allParts = payload.allParts;
                    this.partMap = payload.partMap;
                    resolve();
                }
            });
            this.worker.postMessage({ type: 'load_part_data' });
        });
    }

    findPartName(part) {
        if (this.partMap.has(part.subType)) {
            const subTypeMap = this.partMap.get(part.subType);
            if (subTypeMap.has(part.index)) {
                return subTypeMap.get(part.index).name;
            }
        }
        return null;
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

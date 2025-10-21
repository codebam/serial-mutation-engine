
export interface AssetToken {
    value: bigint;
    bitLength: number;
    bits: number[];
    position: number;
}

export interface ParsedSerial {
    preamble: string;
    assets: AssetToken[];
    assets_fixed: AssetToken[];
    assets_varint: AssetToken[];
    parsingMode: 'fixed' | 'varint';
    trailer: string;
    level?: {
        value: string;
        position: number;
    };
    manufacturer?: {
        name: string;
        pattern: string;
        position: number;
    };
}

export interface State {
    repository: string;
    seed: string;
    itemType: string;
    counts: { [key: string]: number };
    rules: {
        targetOffset: number;
        mutableStart: number;
        mutableEnd: number;
        minChunk: number;
        maxChunk: number;
        targetChunk: number;
        minPart: number;
        maxPart: number;
        legendaryChance: number;
    };
    generateStats: boolean;
    debugMode: boolean;
    bitSize: number;
}

export {};

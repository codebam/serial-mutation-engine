
export interface AssetToken {
    value: bigint;
    bitLength: number;
    bits: number[];
}

export interface ParsedSerial {
    preamble: string;
    assets: string[];
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
}

export {};

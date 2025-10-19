import { Bitstream } from './bitstream';

export const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function stringToBits(s: string): number[] {
    return s.split('').map(c => parseInt(c, 2));
}

export const ELEMENT_FLAG = '0001010110000';
export const ELEMENT_FLAG_BITS = stringToBits(ELEMENT_FLAG);

export const ELEMENTAL_PATTERNS_V2 = {
    "CORR": "10101000",
    "CRYO": "11101000",
    "FIRE": "10011000",
    "RAD": "11011000",
    "SHOCK": "10111000",
};
export const ELEMENTAL_PATTERNS_V2_BITS: Record<string, number[]> = Object.fromEntries(
    Object.entries(ELEMENTAL_PATTERNS_V2).map(([name, pattern]) => [name, stringToBits(pattern)])
);


export const END_OF_ASSETS_MARKER = '01100011011001010110110001100101011100110111010001100101';
export const END_OF_ASSETS_MARKER_BITS = stringToBits(END_OF_ASSETS_MARKER);

export const MANUFACTURER_PATTERNS: Record<string, string[]> = {
    "Jakobs": ["2107", "2137", "2124", "2130", "21a5", "21a4"],
    "Maliwan": ["2127", "212b", "2114", "21a5"],
    "Order": ["2117", "213c", "2108", "21a4", "21a5"],
    "Ripper": ["213b", "2133", "2138", "21a4", "21a5"],
    "Vladof": ["2103", "211b", "2113", "21a5", "21a4"],
    "Daedalus": ["210b", "212c", "2104", "2110", "21a4", "21a5", "21a0"],
    "Tediore": ["211c", "2134", "2128", "21a5", "21a4"],
    "Torgue": ["2123", "210c", "2118", "21a4", "21a5"],
    "Amon": ["213f"],
    "Harlowe": ["21a5"],
    "Rafa": ["21a4"],
    "Vex": ["211f"],
    "Atlas": ["21a4"],
    "CoV": ["21a4"],
    "Hyperion": ["21a4"]
};
export const MANUFACTURER_PATTERNS_BITS: Record<string, number[][]> = Object.fromEntries(
    Object.entries(MANUFACTURER_PATTERNS).map(([name, patterns]) => [
        name,
        patterns.map(p => stringToBits(parseInt(p, 16).toString(2).padStart(16, '0')))
    ])
);

export function findBitPattern(bytes: number[], pattern: number[], startBit: number = 0): number {
    const patternLength = pattern.length;
    if (patternLength === 0) {
        return startBit;
    }
    const totalBits = bytes.length * 8;

    for (let i = startBit; i <= totalBits - patternLength; i++) {
        let match = true;
        for (let j = 0; j < patternLength; j++) {
            const currentBitPos = i + j;
            const byteIndex = Math.floor(currentBitPos / 8);
            const bitIndex = currentBitPos % 8;
            const bit = (bytes[byteIndex] >> (7 - bitIndex)) & 1;

            if (bit !== pattern[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            return i;
        }
    }
    return -1;
}

export const standardLevelDetection_byte = (bytes: number[]): [number | string, number] => {
    const LEVEL_MARKER_BITS = stringToBits('000000');
    const valid_markers: [number, number, number][] = [];
    let search_pos = 0;
    while (search_pos < bytes.length * 8) {
        const marker_pos = findBitPattern(bytes, LEVEL_MARKER_BITS, search_pos);
        if (marker_pos === -1) {
            break;
        }

        const stream = new Bitstream(bytes);
        stream.bit_pos = marker_pos + LEVEL_MARKER_BITS.length;
        const level_value = stream.read(8);

        if (level_value !== null) {
            let decoded_level: number | null = null;
            if (level_value === 49) {
                decoded_level = 1;
            } else if (level_value === 50) {
                decoded_level = 50;
            } else if (level_value >= 1 && level_value <= 50) {
                decoded_level = level_value;
            } else if (level_value >= 49 && level_value <= 98) {
                const actual_level = level_value - 48;
                if (actual_level >= 1 && actual_level <= 50) {
                    decoded_level = actual_level;
                }
            }

            if (decoded_level !== null) {
                valid_markers.push([marker_pos, decoded_level, level_value]);
            }
        }
        search_pos = marker_pos + 1;
    }


    valid_markers.sort((a, b) => a[0] - b[0]);

    if (valid_markers.length > 0) return [valid_markers[0][1], valid_markers[0][0]];

    return ['Unknown', -1];
};

export const enhancedLevelDetection_byte = (bytes: number[]): [number | string, number] => {
    type Candidate = [number, number, number, string];
    const all_candidates: Candidate[] = [];

    for (let level = 0; level <= 50; level++) {
        const pattern = stringToBits(level.toString(2).padStart(8, '0'));
        let search_pos = 0;
        while(search_pos < bytes.length * 8) {
            const pos = findBitPattern(bytes, pattern, search_pos);
            if (pos === -1) break;
            const score = 100 - Math.floor(pos / 10);
            all_candidates.push([level, pos, score, 'direct']);
            search_pos = pos + 1;
        }
    }

    for (let level = 0; level <= 50; level++) {
        const offset_value = level + 48;
        const pattern = stringToBits(offset_value.toString(2).padStart(8, '0'));
        let search_pos = 0;
        while(search_pos < bytes.length * 8) {
            const pos = findBitPattern(bytes, pattern, search_pos);
            if (pos === -1) break;
            const score = 90 - Math.floor(pos / 10);
            all_candidates.push([level, pos, score, 'offset']);
            search_pos = pos + 1;
        }
    }

    all_candidates.sort((a, b) => b[2] - a[2]);

    const level_0_candidates = all_candidates.filter(c => c[0] === 0);
    if (level_0_candidates.length > 0 && level_0_candidates[0][2] >= 20) return [0, level_0_candidates[0][1]];

    const level_10_candidates = all_candidates.filter(c => c[0] === 10);
    if (level_10_candidates.length >= 3) return [10, level_10_candidates[0][1]];

    if (all_candidates.length > 0) return [all_candidates[0][0], all_candidates[0][1]];

    return ['Unknown', -1];
};

export const detectItemLevel_byte = (bytes: number[]): [number | string, number] => {
    const [standard_result, standard_pos] = standardLevelDetection_byte(bytes);

    const [enhanced_result, enhanced_pos] = enhancedLevelDetection_byte(bytes);

    if (standard_result !== 'Unknown') return [standard_result, standard_pos];

    return [enhanced_result, enhanced_pos];
};
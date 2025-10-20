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

export const standardLevelDetection_byte = (bytes: number[]): [number | string, number, number[], number] => { // Added score to return
    const LEVEL_MARKER_BITS = stringToBits('000000');
    const valid_markers: [number, number, number, number[], number][] = []; // Added score
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
            } else if (level_value === 2) {
                decoded_level = 2;
            } else if (level_value === 50) {
                decoded_level = 50;
            } else if (level_value >= 51 && level_value <= 97) {
                decoded_level = level_value - 48;
            }

            if (decoded_level !== null) {
                const level_bits = level_value.toString(2).padStart(8, '0').split('').map(Number);
                const score = (marker_pos % 8 === 0) ? 100 : 50; // Prioritize byte-aligned
                valid_markers.push([marker_pos, decoded_level, level_value, level_bits, score]);
            }
        }
        search_pos = marker_pos + 1;
    }


    valid_markers.sort((a, b) => {
        if (a[4] !== b[4]) {
            return b[4] - a[4]; // Higher score first
        }
        return a[0] - b[0]; // Then by position
    });

    if (valid_markers.length > 0) {
        const best_marker = valid_markers[0];
        return [best_marker[1], best_marker[0], best_marker[3], best_marker[4]];
    }

    return ['Unknown', -1, [], 0];
};

export const enhancedLevelDetection_byte = (bytes: number[]): [number | string, number, number[], number] => { // Added score to return
    type Candidate = [number, number, number, string, number[]];
    const all_candidates: Candidate[] = [];

    for (let level = 0; level <= 50; level++) {
        const pattern = stringToBits(level.toString(2).padStart(8, '0'));
        let search_pos = 0;
        while(search_pos < bytes.length * 8) {
            const pos = findBitPattern(bytes, pattern, search_pos);
            if (pos === -1) break;
            const score = 100 - Math.floor(pos / 10);
            all_candidates.push([level, pos, score, 'direct', pattern]);
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
            all_candidates.push([level, pos, score, 'offset', pattern]);
            search_pos = pos + 1;
        }
    }

    all_candidates.sort((a, b) => b[2] - a[2]);

    if (all_candidates.length > 0) {
        const best_candidate = all_candidates[0];
        return [best_candidate[0], best_candidate[1], best_candidate[4], best_candidate[2]];
    }

    return ['Unknown', -1, [], 0];
};

export const detectItemLevel_byte = (bytes: number[]): [number | string, number, number[], string] => {
    const [standard_result, standard_pos, standard_bits, standard_score] = standardLevelDetection_byte(bytes);

    const [enhanced_result, enhanced_pos, enhanced_bits, enhanced_score] = enhancedLevelDetection_byte(bytes);

    if (standard_score >= enhanced_score && standard_result !== 'Unknown') {
        return [standard_result, standard_pos, standard_bits, 'standard'];
    } else if (enhanced_score > standard_score && enhanced_result !== 'Unknown') {
        return [enhanced_result, enhanced_pos, enhanced_bits, 'enhanced'];
    } else if (standard_result !== 'Unknown') {
        return [standard_result, standard_pos, standard_bits, 'standard'];
    } else {
        return [enhanced_result, enhanced_pos, enhanced_bits, 'enhanced'];
    }
};

export function valueToVarIntBits(value: bigint, padToLength?: number): number[] {
    if (value === 0n) {
        let bits = [0, 0, 0, 0, 0, 0];
        if (padToLength) {
            while (bits.length < padToLength) {
                bits.push(1, 0, 0, 0, 0, 0); // padding with 0-value chunks
            }
            bits[bits.length - 6] = 0; // Ensure last chunk is terminator
        }
        return bits.slice(0, padToLength || bits.length);
    }

    let bits: number[] = [];
    let val = value;

    while (val > 0n) {
        const chunk_data = Number(val & 0b11111n);
        val >>= 5n;
        const continuation_bit = val > 0n ? 1 : 0;
        
        const chunk_bits = chunk_data.toString(2).padStart(5, '0').split('').map(Number);
        bits.push(continuation_bit, ...chunk_bits);
    }

    if (padToLength && bits.length < padToLength) {
        // remove terminator from last chunk
        bits[bits.length - 6] = 1;
        while (bits.length < padToLength) {
            bits.push(1, 0, 0, 0, 0, 0); // padding with 0-value chunks
        }
        // Ensure last chunk is terminator
        bits[bits.length - 6] = 0;
        bits = bits.slice(0, padToLength);
    }

    return bits;
}

export const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

export const ELEMENT_FLAG = '0001010110000';
export const ELEMENTAL_PATTERNS_V2 = {
    "CORR": "10101000",
    "CRYO": "11101000",
    "FIRE": "10011000",
    "RAD": "11011000",
    "SHOCK": "10111000",
};
export const BULLET_TYPE_PATTERNS: Record<string, string[]> = {
    "Jakobs Kinetic": ["2210", "2211"],
    "Jakobs Explosive": ["2212", "2213"],
    "Maliwan Elemental": ["2214", "2215"],
    "Maliwan Cryo": ["2216"],
    "Maliwan Shock": ["2217"],
    "Torgue Explosive": ["2218", "2219"],
    "Torgue Kinetic": ["221a", "221b"],
    "Daedalus Kinetic": ["221c", "221d"],
    "Daedalus Precision": ["221e", "221f"],
    "COV Kinetic": ["2220", "2221"],
    "COV Explosive": ["2222", "2223"],
    "Ripper Kinetic": ["2224", "2225"],
    "Ripper Melee": ["2226", "2227"],
};
export const MANUFACTURER_PATTERNS: Record<string, string[]> = {
    "Jakobs": [
        "2107",
        "2137",
        "2124",
        "2130",
        "21a5",
        "21a4"
    ],
    "Maliwan": [
        "2127",
        "212b",
        "2114",
        "21a5"
    ],
    "Order": [
        "2117",
        "213c",
        "2108",
        "21a4",
        "21a5"
    ],
    "Ripper": [
        "213b",
        "2133",
        "2138",
        "21a4",
        "21a5"
    ],
    "Vladof": [
        "2103",
        "211b",
        "2113",
        "21a5",
        "21a4"
    ],
    "Daedalus": [
        "210b",
        "212c",
        "2104",
        "2110",
        "21a4",
        "21a5",
        "21a0"
    ],
    "Tediore": [
        "211c",
        "2134",
        "2128",
        "21a5",
        "21a4"
    ],
    "Torgue": [
        "2123",
        "210c",
        "2118",
        "21a4",
        "21a5"
    ],
    "Amon": [
        "213f"
    ],
    "Harlowe": [
        "21a5"
    ],
    "Rafa": [
        "21a4"
    ],
    "Vex": [
        "211f"
    ],
    "Atlas": [
        "21a4"
    ],
    "CoV": [
        "21a4"
    ],
    "Hyperion": [
        "21a4"
    ]
};

export const standardLevelDetection = (binary: string): [number | string, number] => {
    const LEVEL_MARKER = '000000';
    const valid_markers = [];
    for (let i = 0; i < binary.length - 13; i++) {
        if (binary.substring(i, i + 6) === LEVEL_MARKER) {
            const level_bits = binary.substring(i + 6, i + 14);
            const level_value = parseInt(level_bits, 2);
            let decoded_level = null;
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
                valid_markers.push([i, decoded_level, level_value]);
            }
        }
    }

    const level_50_markers = valid_markers.filter(m => m[1] === 50);
    if (level_50_markers.length > 0) return [50, level_50_markers[0][0]];

    const level_49_markers = valid_markers.filter(m => m[1] === 49);
    if (level_49_markers.length > 0) return [49, level_49_markers[0][0]];

    if (valid_markers.length > 0) return [valid_markers[0][1], valid_markers[0][0]];

    return ['Unknown', -1];
};

export const enhancedLevelDetection = (binary: string): [number | string, number] => {
    const all_candidates = [];

    for (let level = 0; level <= 50; level++) {
        const pattern = level.toString(2).padStart(8, '0');
        for (let i = 0; i < binary.length - 7; i++) {
            if (binary.substring(i, i + 8) === pattern) {
                const score = 100 - Math.floor(i / 10);
                all_candidates.push([level, i, score, 'direct']);
            }
        }
    }

    for (let level = 0; level <= 50; level++) {
        const offset_value = level + 48;
        const pattern = offset_value.toString(2).padStart(8, '0');
        for (let i = 0; i < binary.length - 7; i++) {
            if (binary.substring(i, i + 8) === pattern) {
                const score = 90 - Math.floor(i / 10);
                all_candidates.push([level, i, score, 'offset']);
            }
        }
    }

    all_candidates.sort((a, b) => b[2] - a[2]);

    const level_50_candidates = all_candidates.filter(c => c[0] === 50);
    if (level_50_candidates.length > 0) return [50, level_50_candidates[0][1]];

    const level_49_candidates = all_candidates.filter(c => c[0] === 49);
    if (level_49_candidates.length > 0) return [49, level_49_candidates[0][1]];
    
    const level_0_candidates = all_candidates.filter(c => c[0] === 0);
    if (level_0_candidates.length > 0 && level_0_candidates[0][2] >= 20) return [0, level_0_candidates[0][1]];

    const level_10_candidates = all_candidates.filter(c => c[0] === 10);
    if (level_10_candidates.length >= 3) return [10, level_10_candidates[0][1]];

    if (all_candidates.length > 0) return [all_candidates[0][0], all_candidates[0][1]];

    return ['Unknown', -1];
};

export const detectItemLevel = (binary: string): [number | string, number] => {
    const [standard_result, standard_pos] = standardLevelDetection(binary);

    if (standard_result === 50) return [50, standard_pos];
    if (standard_result === 49) return [49, standard_pos];

    const [enhanced_result, enhanced_pos] = enhancedLevelDetection(binary);

    if (enhanced_result === 50) return [50, enhanced_pos];
    if (enhanced_result === 49) return [49, enhanced_pos];

    if (standard_result !== 'Unknown') return [standard_result, standard_pos];

    return [enhanced_result, enhanced_pos];
};

export const hexToBinary = (hex: string): string => {
    return hex.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
};

export const encodeSerial = (binaryData: string): string => {
    const bytes = [];
    for (let i = 0; i < binaryData.length; i += 8) {
        const byteString = binaryData.substring(i, i + 8);
        if (byteString.length < 8) continue;
        bytes.push(parseInt(byteString, 2));
    }

    const unmirrored_bytes = bytes.map(byte => {
        let unmirrored = 0;
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                unmirrored |= 1 << (7 - j);
            }
        }
        return unmirrored;
    });

    let encoded = '';
    const num_full_chunks = Math.floor(unmirrored_bytes.length / 4);

    for (let i = 0; i < num_full_chunks; i++) {
        const chunk = unmirrored_bytes.slice(i * 4, i * 4 + 4);
        let value = ((chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]) >>> 0;

        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block;
    }

    const last_chunk_bytes = unmirrored_bytes.slice(num_full_chunks * 4);
    if (last_chunk_bytes.length > 0) {
        const padding_size = 4 - last_chunk_bytes.length;
        while (last_chunk_bytes.length < 4) {
            last_chunk_bytes.push(0);
        }
        let value = ((last_chunk_bytes[0] << 24) | (last_chunk_bytes[1] << 16) | (last_chunk_bytes[2] << 8) | last_chunk_bytes[3]) >>> 0;

        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block.substring(0, 5 - padding_size);
    }
    
    return '@U' + encoded;
};

const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function decodeBase85Bytes(encodedSerial: string): number[] {
    if (encodedSerial.startsWith('@U')) {
        encodedSerial = encodedSerial.substring(2);
    }

    const decodedBytes: number[] = [];
    let currentValue = 0;
    let charCount = 0;

    for (let i = 0; i < encodedSerial.length; i++) {
        const char = encodedSerial[i];
        const index = BASE85_ALPHABET.indexOf(char);
        if (index === -1) {
            continue; // Skip invalid characters
        }
        currentValue = currentValue * 85 + index;
        charCount++;
        if (charCount === 5) {
            decodedBytes.push((currentValue >> 24) & 0xFF);
            decodedBytes.push((currentValue >> 16) & 0xFF);
            decodedBytes.push((currentValue >> 8) & 0xFF);
            decodedBytes.push(currentValue & 0xFF);
            currentValue = 0;
            charCount = 0;
        }
    }

    if (charCount > 0) {
        for (let i = charCount; i < 5; i++) {
            currentValue = currentValue * 85 + 84;
        }
        for (let i = 0; i < charCount - 1; i++) {
            decodedBytes.push((currentValue >> (24 - i * 8)) & 0xFF);
        }
    }
    return decodedBytes;
}

export function serialToBytes(serial: string): number[] {
    const decodedBytes = decodeBase85Bytes(serial.trim());
    const mirroredBytes = decodedBytes.map(byte => {
        let mirrored = 0;
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                mirrored |= 1 << (7 - j);
            }
        }
        return mirrored;
    });
    return mirroredBytes;
}

function serialToBinary(serial: string): string {
    const bytes = serialToBytes(serial);
    return bytes.map(b => b.toString(2).padStart(8, '0')).join('');
}

export class BL4StandaloneDecoder {
    consistentPerks: { [key: number]: { position: number; bits: number } };
    variablePerks: { [key: number]: { positions: number[]; bits: number } };
    specialPerks: { [key: number]: { type: string; patterns: any[] } };

    constructor() {
        this.consistentPerks = {
            2: { position: 3, bits: 6 },
            4: { position: 4, bits: 6 },
            1: { position: 21, bits: 6 },
            3: { position: 12, bits: 6 },
            25: { position: 25, bits: 6 },
            11: { position: 87, bits: 6 },
            55: { position: 93, bits: 6 }
        };

        this.variablePerks = {
            54: { positions: [178, 157, 167, 66, 74, 141, 146, 65], bits: 6 },
            5: { positions: [81, 63], bits: 6 },
            62: { positions: [73, 72, 65, 149, 160, 138], bits: 6 },
            63: { positions: [69, 137, 148, 72, 157, 146, 135, 132], bits: 6 },
            44: { positions: [133, 144, 122, 71, 12, 117], bits: 6 },
            42: { positions: [98, 65, 93, 74], bits: 6 }
        };

        this.specialPerks = {
            257: {
                type: 'base_encoded',
                patterns: [
                    { basePos: 0, remainderPos: 26, multiplier: 32 },
                    { basePos: 1, remainderPos: 26, multiplier: 16 },
                    { basePos: 4, remainderPos: 26, multiplier: 64 }
                ]
            },
            320: {
                type: 'offset_encoded',
                patterns: [
                    { position: 300, offset: 280 }
                ]
            },
            13: {
                type: 'offset_encoded',
                patterns: [
                    { position: 12, offset: -10 },
                    { position: 66, offset: 0 }
                ]
            }
        };
    }

    extractConsistentPerks(binary: string): any[] {
        const foundPerks: any[] = [];
        
        for (const perkId in this.consistentPerks) {
            const mapping = this.consistentPerks[perkId];
            const pos = mapping.position;
            const bits = mapping.bits;
            
            if (pos + bits <= binary.length) {
                const perkBinary = binary.substring(pos, pos + bits);
                try {
                    const perkValue = parseInt(perkBinary, 2);
                    foundPerks.push({ value: BigInt(perkValue), position: pos, bitLength: bits, bits: perkBinary.split('').map(Number) });
                } catch (e) {
                    // Skip invalid binary
                }
            }
        }
        
        return foundPerks;
    }

    extractVariablePerks(binary: string): any[] {
        const foundPerks: any[] = [];
        
        for (const perkId in this.variablePerks) {
            const mapping = this.variablePerks[perkId];
            const bits = mapping.bits;
            
            for (const pos of mapping.positions) {
                if (pos + bits <= binary.length) {
                    const perkBinary = binary.substring(pos, pos + bits);
                    try {
                        const perkValue = parseInt(perkBinary, 2);
                        foundPerks.push({ value: BigInt(perkValue), position: pos, bitLength: bits, bits: perkBinary.split('').map(Number) });
                        break; // Found it, move to next perk
                    } catch (e) {
                        // Skip invalid binary
                    }
                }
            }
        }
        
        return foundPerks;
    }

    extractSpecialPerks(binary: string): any[] {
        const foundPerks: any[] = [];
        
        // Extract perk 257 (base-encoded)
        if (this.specialPerks[257]) {
            const patterns = this.specialPerks[257].patterns;
            for (const pattern of patterns) {
                const basePos = pattern.basePos;
                const remainderPos = pattern.remainderPos;
                const multiplier = pattern.multiplier;
                
                if (basePos + 6 <= binary.length && remainderPos + 6 <= binary.length) {
                    const baseBinary = binary.substring(basePos, basePos + 6);
                    const remainderBinary = binary.substring(remainderPos, remainderPos + 6);
                    
                    try {
                        const baseValue = parseInt(baseBinary, 2);
                        const remainderValue = parseInt(remainderBinary, 2);
                        const decodedValue = baseValue * multiplier + remainderValue;
                        
                        if (decodedValue === 257) {
                            // Do not add a perk here, the underlying assets will be found by the main parser
                            break;
                        }
                    } catch (e) {
                        // Skip invalid binary
                    }
                }
            }
        }
        
        // Extract perk 320 (offset-encoded)
        if (this.specialPerks[320]) {
            const patterns = this.specialPerks[320].patterns;
            for (const pattern of patterns) {
                const pos = pattern.position;
                const offset = pattern.offset;
                
                if (pos + 6 <= binary.length) {
                    const perkBinary = binary.substring(pos, pos + 6);
                    try {
                        const perkValue = parseInt(perkBinary, 2);
                        const decodedValue = perkValue + offset;
                        
                        if (decodedValue === 320) {
                            foundPerks.push({ value: BigInt(perkValue), position: pos, bitLength: 6, bits: perkBinary.split('').map(Number), perkValue: 320n });
                            break;
                        }
                    } catch (e) {
                        // Skip invalid binary
                    }
                }
            }
        }
        
        // Extract perk 13 (offset-encoded)
        if (this.specialPerks[13]) {
            const patterns = this.specialPerks[13].patterns;
            for (const pattern of patterns) {
                const pos = pattern.position;
                const offset = pattern.offset;
                
                if (pos + 6 <= binary.length) {
                    const perkBinary = binary.substring(pos, pos + 6);
                    try {
                        const perkValue = parseInt(perkBinary, 2);
                        const decodedValue = perkValue - offset;
                        
                        if (decodedValue === 13) {
                            foundPerks.push({ value: BigInt(perkValue), position: pos, bitLength: 6, bits: perkBinary.split('').map(Number), perkValue: 13n });
                            break;
                        }
                    } catch (e) {
                        // Skip invalid binary
                    }
                }
            }
        }
        
        return foundPerks;
    }

    decodeSerial(serial: string) {
        try {
            const binary = serialToBinary(serial);
            
            const consistentPerks = this.extractConsistentPerks(binary);
            const variablePerks = this.extractVariablePerks(binary);
            const specialPerks = this.extractSpecialPerks(binary);
            
            const allPerks = [...consistentPerks, ...variablePerks, ...specialPerks];
            
            const uniquePerks = Array.from(new Map(allPerks.map(p => [p.value, p])).values());
            uniquePerks.sort((a, b) => Number(a.value - b.value));
            
            return {
                perks: uniquePerks,
                binaryLength: binary.length,
                totalFound: uniquePerks.length
            };
            
        } catch (error: any) {
            return { error: error.message };
        }
    }
}

export function decodeSerialStandalone(serial: string): any {
    const decoder = new BL4StandaloneDecoder();
    return decoder.decodeSerial(serial);
}

const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function encodeBase85Bytes(bytes) {
    let encoded = '';
    let i = 0;

    for (i = 0; i + 3 < bytes.length; i += 4) {
        let value = ((bytes[i] << 24) >>> 0) + ((bytes[i+1] << 16) >>> 0) + ((bytes[i+2] << 8) >>> 0) + bytes[i+3];
        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block;
    }

    if (i < bytes.length) {
        const remaining = bytes.length - i;
        let value = 0;
        for (let j = 0; j < remaining; j++) {
            value += bytes[i + j] << (8 * (3 - j));
        }

        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block.substring(0, remaining + 1);
    }

    return '@U' + encoded;
}

function hexToBin(hexStr) {
    let bin = '';
    for (let i = 0; i < hexStr.length; i++) {
        bin += parseInt(hexStr[i], 16).toString(2).padStart(4, '0');
    }
    return bin;
}

function encode(parsed) {
    let binary = '';
    if (parsed.type) {
        const typeBin = hexToBin(parsed.type.hex);
        binary += typeBin.substring(0, parsed.type.bits);
    }
    
    if (parsed.header) {
        const headerBin = hexToBin(parsed.header.hex);
        binary += headerBin.substring(0, parsed.header.bits);
    }

    if (parsed.prefix) {
        const prefixBin = hexToBin(parsed.prefix.hex);
        binary += prefixBin.substring(0, parsed.prefix.bits);
    }

    parsed.chunks.forEach(c => {
        binary += c.len_code.toString(2).padStart(4, '0');
        if (c.chunk_data) {
            const chunkBin = hexToBin(c.chunk_data.hex);
            binary += chunkBin.substring(0, c.chunk_data.bits);
        }
    });

    if (parsed.trailer_chunks) {
        parsed.trailer_chunks.forEach(c => {
            if (c.len_code === 'raw') {
                const chunkBin = hexToBin(c.chunk_data.hex);
                binary += chunkBin.substring(0, c.chunk_data.bits);
            } else {
                binary += c.len_code.toString(2).padStart(4, '0');
                if (c.chunk_data) {
                    const chunkBin = hexToBin(c.chunk_data.hex);
                    binary += chunkBin.substring(0, c.chunk_data.bits);
                }
            }
        });
    }

    return binary;
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const parsed = JSON.parse(input);
    const binary = encode(parsed);

    const bytes = [];
    for (let i = 0; i < binary.length; i += 8) {
        const byteString = binary.substring(i, i + 8);
        if (byteString.length < 8) continue; // Ignore incomplete bytes
        bytes.push(parseInt(byteString, 2));
    }

    const mirroredBytes = bytes.map(byte => {
        let mirrored = 0;
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                mirrored |= 1 << (7 - j);
            }
        }
        return mirrored;
    });

    const base85 = encodeBase85Bytes(mirroredBytes);
    console.log(base85);
});

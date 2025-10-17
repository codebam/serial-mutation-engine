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

    if (parsed.trailer) {
        const trailerBin = hexToBin(parsed.trailer.hex);
        binary += trailerBin.substring(0, parsed.trailer.bits);
    }

    return binary;
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const parsed = JSON.parse(input);
    const binary = encode(parsed);
    console.log(binary);
});

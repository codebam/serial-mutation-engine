class Bitstream {
    constructor(binaryString) {
        this.binary = binaryString;
        this.pos = 0;
    }

    read(length) {
        if (this.pos + length > this.binary.length) return null;
        const bits = this.binary.substring(this.pos, this.pos + length);
        this.pos += length;
        return bits;
    }
}

function readHex(stream, length) {
    const bits = stream.read(length);
    if (bits === null) return null;

    let paddedBits = bits;
    while (paddedBits.length % 4 !== 0) {
        paddedBits += '0';
    }

    let hex = '';
    for (let i = 0; i < paddedBits.length; i += 4) {
        hex += parseInt(paddedBits.substring(i, i + 4), 2).toString(16);
    }

    return { hex: hex, bits: length };
}

function parse_chunk(stream) {
    const len_code_bits = stream.read(4);
    if (len_code_bits === null) return null;
    const len_code = parseInt(len_code_bits, 2);

    let len = 0;
    if (len_code === 5) {
        len = 12;
    } else if (len_code === 10) {
        len = 20;
    } else if (len_code === 11) {
        len = 14;
    } else {
        stream.pos -= 4; // Rewind
        return null;
    }

    const chunk_data = readHex(stream, len - 4);
    return { len_code: len_code, chunk_data };
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const binary = input.trim().replace(/\s/g, "");
    const stream = new Bitstream(binary);

    const type = readHex(stream, 10);
    const header = readHex(stream, 78);
    const prefix = readHex(stream, 4);
    
    const chunks = [];
    const parsed = {
        type: type,
        header: header,
        prefix: prefix,
        chunks: chunks
    };

    while(stream.pos < binary.length) {
        const chunk = parse_chunk(stream);
        if (chunk) {
            chunks.push(chunk);
        } else {
            const remainingBits = stream.read(binary.length - stream.pos);
            if (remainingBits && remainingBits.length > 0) {
                const trailerChunks = [];
                const chunkSize = 64;
                for (let i = 0; i < remainingBits.length; i += chunkSize) {
                    const chunk = remainingBits.substring(i, i + chunkSize);
                    trailerChunks.push({ len_code: 'raw', chunk_data: readHex({ read: () => chunk }, chunk.length) });
                }
                parsed.trailer_chunks = trailerChunks;
            }
            break;
        }
    }

    console.log(JSON.stringify(parsed));
});

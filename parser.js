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
    let trailer = null;
    while(stream.pos < binary.length) {
        const chunk = parse_chunk(stream);
        if (chunk) {
            chunks.push(chunk);
        } else {
            const remaining = stream.read(binary.length - stream.pos);
            if (remaining && remaining.length > 0) {
                trailer = readHex({ read: () => remaining }, remaining.length);
            }
            break;
        }
    }

    const parsed = {
        type: type,
        header: header,
        prefix: prefix,
        chunks: chunks
    };
    if (trailer) {
        parsed.trailer = trailer;
    }

    console.log(JSON.stringify(parsed));
});

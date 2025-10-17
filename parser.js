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

    readInt(length) {
        const bits = this.read(length);
        if (bits === null) return null;
        return parseInt(bits, 2);
    }
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const binary = input.trim().replace(/\s/g, "");
    const stream = new Bitstream(binary);

    const type = stream.read(10);
    const header = stream.read(78);

    const chunks = [];
    while(stream.pos < binary.length) {
        const chunk = stream.read(12);
        if (chunk) {
            chunks.push(chunk);
        }
    }

    const parsed = {
        type: type,
        header: header,
        chunks: chunks
    };

    console.log(JSON.stringify(parsed, null, 2));
});
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
    const rest = stream.read(binary.length - 88);

    console.log(type);
    console.log(header);
    console.log(rest);
});
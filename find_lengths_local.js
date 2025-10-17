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

const binary = "001000011010010000111001011000000001100100000110001001110000010001000011001101101111011100000000";
const header = binary.substring(10, 88);

const expected = [312, 0, 1, 50, 2, 3819];

for (let len1 = 9; len1 < 16; len1++) {
for (let len2 = 1; len2 < 8; len2++) {
for (let len3 = 1; len3 < 8; len3++) {
for (let len4 = 6; len4 < 16; len4++) {
for (let len5 = 2; len5 < 16; len5++) {
    const len6 = 78 - (len1 + len2 + len3 + len4 + len5);
    if (len6 <= 0) continue;

    const s = new Bitstream(header);
    const v1 = s.readInt(len1);
    const v2 = s.readInt(len2);
    const v3 = s.readInt(len3);
    const v4 = s.readInt(len4);
    const v5 = s.readInt(len5);
    const v6 = s.readInt(len6);

    if (v1 === expected[0] && v2 === expected[1] && v3 === expected[2] && v4 === expected[3] && v5 === expected[4] && v6 === expected[5]) {
        console.log(`Match found! Lengths: ${len1}, ${len2}, ${len3}, ${len4}, ${len5}, ${len6}`);
    }
}
}
}
}
}

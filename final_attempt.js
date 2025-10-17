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

    readIntLE(length) {
        const bits = this.read(length);
        if (bits === null) return null;
        
        // Pad to a multiple of 8
        let padded = bits;
        while (padded.length % 8 !== 0) {
            padded = '0' + padded;
        }

        let reversed = '';
        for (let i = 0; i < padded.length; i += 8) {
            reversed = padded.substring(i, i + 8) + reversed;
        }
        return parseInt(reversed, 2);
    }
}

const header = "10100100001110010110000000011001000001100010011100000100010000110011011011110111";
const expected = [312, 0, 1, 50, 2, 3819];

// Big-endian search
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
        console.log(`Big-endian match found! Lengths: ${len1}, ${len2}, ${len3}, ${len4}, ${len5}, ${len6}`);
    }
}
}
}
}
}

// Little-endian search
for (let len1 = 9; len1 < 16; len1++) {
for (let len2 = 1; len2 < 8; len2++) {
for (let len3 = 1; len3 < 8; len3++) {
for (let len4 = 6; len4 < 16; len4++) {
for (let len5 = 2; len5 < 16; len5++) {
    const len6 = 78 - (len1 + len2 + len3 + len4 + len5);
    if (len6 <= 0) continue;

    const s = new Bitstream(header);
    const v1 = s.readIntLE(len1);
    const v2 = s.readIntLE(len2);
    const v3 = s.readIntLE(len3);
    const v4 = s.readIntLE(len4);
    const v5 = s.readIntLE(len5);
    const v6 = s.readIntLE(len6);

    if (v1 === expected[0] && v2 === expected[1] && v3 === expected[2] && v4 === expected[3] && v5 === expected[4] && v6 === expected[5]) {
        console.log(`Little-endian match found! Lengths: ${len1}, ${len2}, ${len3}, ${len4}, ${len5}, ${len6}`);
    }
}
}
}
}
}

const binary = "101001000011100101100000000110000000011000000000100000000110000000000000";

for (let offset = 0; offset < binary.length; offset++) {
    for (let length = 9; length < 16; length++) {
        if (offset + length > binary.length) continue;
        const bits = binary.substring(offset, offset + length);
        const val = parseInt(bits, 2);
        if (val === 312) {
            console.log(`Found 312 at offset ${offset} with length ${length}, bits: ${bits}`);
        }
    }
}

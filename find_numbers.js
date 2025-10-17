const binary = "001000011010010000111001011000000001100100000110001001110000010001000011001101101111011100000000";
const header = binary.substring(10);

const numbers = {
    '312': '100111000',
    '0': '0',
    '1': '1',
    '50': '110010',
    '2': '10',
    '3819': '111011101011'
};

for (const [num, pattern] of Object.entries(numbers)) {
    for (let offset = 0; offset < header.length; offset++) {
        if (header.substring(offset, offset + pattern.length) === pattern) {
            console.log(`Found ${num} at offset ${offset}`);
        }
    }
}

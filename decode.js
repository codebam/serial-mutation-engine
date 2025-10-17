const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function decodeBase85Bytes(encodedSerial) {
    if (encodedSerial.startsWith('@U')) {
        encodedSerial = encodedSerial.substring(2);
    }

    const decodedBytes = [];
    let currentValue = 0;
    let charCount = 0;

    for (let i = 0; i < encodedSerial.length; i++) {
        const char = encodedSerial[i];
        const index = BASE85_ALPHABET.indexOf(char);
        if (index === -1) {
            continue; // Skip invalid characters
        }
        currentValue = currentValue * 85 + index;
        charCount++;
        if (charCount === 5) {
            decodedBytes.push((currentValue >> 24) & 0xFF);
            decodedBytes.push((currentValue >> 16) & 0xFF);
            decodedBytes.push((currentValue >> 8) & 0xFF);
            decodedBytes.push(currentValue & 0xFF);
            currentValue = 0;
            charCount = 0;
        }
    }

    if (charCount > 0) {
        for (let i = charCount; i < 5; i++) {
            currentValue = currentValue * 85 + 84;
        }
        for (let i = 0; i < charCount - 1; i++) {
            decodedBytes.push((currentValue >> (24 - i * 8)) & 0xFF);
        }
    }
    return decodedBytes;
}

function processSerial(serial) {
    const decodedBytes = decodeBase85Bytes(serial.trim());
    const mirroredBytes = decodedBytes.map(byte => {
        let mirrored = 0;
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                mirrored |= 1 << (7 - j);
            }
        }
        return mirrored;
    });
    const mirroredBinary = mirroredBytes.map(b => b.toString(2).padStart(8, '0')).join('');
    console.log(mirroredBinary);
}

if (process.argv.length > 2) {
    processSerial(process.argv[2]);
} else {
    let input = '';
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', () => {
        processSerial(input);
    });
}

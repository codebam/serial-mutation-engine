import fs from 'fs';

const binary1 = fs.readFileSync('serial1.bin', 'utf8');
const binary2 = fs.readFileSync('serial2.bin', 'utf8');

for (let i = 0; i < binary1.length; i++) {
    if (binary1[i] !== binary2[i]) {
        console.log(`Difference found at index ${i}`);
        console.log(`Serial 1: ...${binary1.substring(i-10, i+10)}...`);
        console.log(`Serial 2: ...${binary2.substring(i-10, i+10)}...`);
        break;
    }
}
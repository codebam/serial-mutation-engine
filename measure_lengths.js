import { execSync } from 'child_process';

function get_binary_len(deserialized) {
    try {
        const serial = execSync(`node reserialize.js '${deserialized}'`).toString().trim();
        if (serial.startsWith("Error")) return -1;
        const binary = execSync(`node decode.js '${serial}'`).toString().trim();
        return binary.length;
    } catch (e) {
        return -1;
    }
}

async function find_length(field_index) {
    let value = 1;
    let prev_len = get_binary_len("0,0,0,0|0,0||");

    while (true) {
        let fields = [0,0,0,0,0,0];
        fields[field_index] = value;
        const deserialized = `${fields[0]},${fields[1]},${fields[2]},${fields[3]}|${fields[4]},${fields[5]}||`;
        const len = get_binary_len(deserialized);

        if (len > prev_len) {
            return Math.ceil(Math.log2(value));
        }
        
        if (value > 2**32) return -1; // Safety break

        value *= 2;
    }
}

async function main() {
    const lengths = [];
    for (let i = 0; i < 6; i++) {
        lengths.push(await find_length(i));
    }
    console.log(lengths);
}

main();
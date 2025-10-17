import { execSync } from 'child_process';
import fs from 'fs';

function get_serial_and_binary(deserialized) {
    try {
        const serial = execSync(`node reserialize.js '${deserialized}'`).toString().trim();
        if (serial.startsWith("Error")) return null;
        const binary = execSync(`node decode.js '${serial}'`).toString().trim();
        return { serial, binary };
    } catch (e) {
        return null;
    }
}

async function main() {
    const dataset = [];
    const base_deserialized = "312, 0, 1, 50| 2, 3819||";
    const keys = ["{9}", "{246:[]}", "{248:27}", "{8}", "{13:8}"];

    let current_deserialized = base_deserialized;
    let data = get_serial_and_binary(current_deserialized);
    if (data) dataset.push({ deserialized: current_deserialized, ...data });

    for (const key of keys) {
        current_deserialized += ` ${key}`;
        data = get_serial_and_binary(current_deserialized.trim());
        if (data) dataset.push({ deserialized: current_deserialized.trim(), ...data });
    }

    fs.writeFileSync('dataset.json', JSON.stringify(dataset, null, 2));
    console.log("Dataset created successfully!");
}

main();
function encode(parsed) {
    let binary = parsed.type;
    binary += parsed.header;
    parsed.keys.forEach(kv => {
        binary += kv.key.toString(2).padStart(4, '0');
    });
    return binary;
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const parsed = JSON.parse(input);
    const binary = encode(parsed);
    console.log(binary);
});

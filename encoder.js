function encode(parsed) {
    let binary = parsed.type;
    binary += parsed.header;
    binary += parsed.prefix;
    parsed.chunks.forEach(c => {
        binary += c.chunk_data;
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
function encode(parsed) {
    let binary = parsed.type;
    
    let headerBin = '';
    for(let i = 0; i < parsed.header.length; i++) {
        headerBin += parseInt(parsed.header[i], 16).toString(2).padStart(4, '0');
    }
    binary += headerBin;

    binary += parsed.prefix;

    parsed.chunks.forEach(c => {
        binary += c.len_code.toString(2).padStart(4, '0');
        let chunkBin = '';
        if (c.chunk_data) {
            for(let i = 0; i < c.chunk_data.length; i++) {
                chunkBin += parseInt(c.chunk_data[i], 16).toString(2).padStart(4, '0');
            }
        }
        binary += chunkBin;
    });

    if (parsed.trailer) {
        let trailerBin = '';
        for(let i = 0; i < parsed.trailer.length; i++) {
            trailerBin += parseInt(parsed.trailer[i], 16).toString(2).padStart(4, '0');
        }
        binary += trailerBin;
    }

    return binary;
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const parsed = JSON.parse(input);
    const binary = encode(parsed);
    console.log(binary);
});
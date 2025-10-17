let lines = [];
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    lines = input.trim().split('\n');
    const type = lines[0];
    const header = lines[1];
    const chunks = lines.slice(2);
    
    let binary = type;
    binary += header;
    binary += chunks.join('');
    
    console.log(binary);
});


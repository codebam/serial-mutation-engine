import https from 'https';

function reserialize(deserializedString) {
    const postData = JSON.stringify({
        deserialized: deserializedString
    });

    const options = {
        hostname: 'borderlands4-deserializer.nicnl.com',
        port: 443,
        path: '/api/v1/reserialize',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(JSON.parse(data));
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

if (process.argv.length > 2) {
    const deserialized = process.argv[2];
    reserialize(deserialized);
}

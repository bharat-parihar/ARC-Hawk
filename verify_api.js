const http = require('http');

const ENDPOINTS = [
    '/health',
    '/api/v1/lineage',
    '/api/v1/lineage/stats',
    '/api/v1/findings',
    '/api/v1/assets',
    '/api/v1/compliance/overview',
    '/api/v1/analytics/trends'
];

async function verifyEndpoint(path) {
    return new Promise((resolve) => {
        http.get(`http://localhost:8080${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ ${path}: ${res.statusCode} OK`);
                    resolve(true);
                } else {
                    console.error(`❌ ${path}: ${res.statusCode} - ${data.substring(0, 100)}`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error(`❌ ${path}: Error - ${err.message}`);
            resolve(false);
        });
    });
}

async function run() {
    console.log('🚀 Starting API Verification...\n');
    let success = true;
    for (const endpoint of ENDPOINTS) {
        if (!await verifyEndpoint(endpoint)) {
            success = false;
        }
    }
    console.log(`\nVerification ${success ? 'PASSED' : 'FAILED'}`);
}

run();

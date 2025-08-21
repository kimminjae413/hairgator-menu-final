// netlify/functions/akool-proxy.js
// AKOOL CloudFront URL 프록시

const https = require('https');

exports.handler = async (event, context) => {
    console.log('🔧 AKOOL 프록시 요청 받음');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    const targetUrl = event.queryStringParameters?.url;
    
    if (!targetUrl || !targetUrl.includes('cloudfront.net')) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid CloudFront URL' })
        };
    }
    
    try {
        console.log('⚡ CloudFront URL 즉시 다운로드:', targetUrl);
        
        // 즉시 CloudFront에서 다운로드
        const imageBuffer = await downloadImage(targetUrl);
        
        console.log('✅ 다운로드 성공, 크기:', imageBuffer.length);
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'image/jpeg',
                'Content-Length': imageBuffer.length,
                'Cache-Control': 'public, max-age=86400'
            },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error('❌ 프록시 다운로드 실패:', error);
        
        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ 
                error: 'CloudFront download failed',
                message: error.message 
            })
        };
    }
};

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            const chunks = [];
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
            });
        });
        
        request.on('error', reject);
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Download timeout'));
        });
    });
}

const fetch = require('node-fetch');

// 환경 변수 설정 (실제 실행 시에는 process.env에서 가져오거나 직접 입력해야 함)
// 주의: 이 스크립트는 로컬 테스트용입니다. 실제 키가 코드에 포함되지 않도록 주의하세요.
// 사용자가 직접 실행할 때는 .env 파일을 로드하거나 환경 변수를 설정하고 실행해야 합니다.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function testSupabaseSearch(query) {
    console.log(`SEARCH QUERY: "${query}"`);
    console.log('--------------------------------------------------');

    if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
        console.error('ERROR: Missing environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY).');
        return;
    }

    try {
        // 1. Generate Embedding
        console.log('1. Generating Embedding...');
        const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: query }] } })
        });

        if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Embedding Failed: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.embedding.values;
        console.log('Embedding Generated.');

        // 2. Supabase RPC Call
        console.log('2. Searching Supabase (hybrid_search_theory_chunks)...');
        const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/hybrid_search_theory_chunks`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query_embedding: queryEmbedding,
                query_text: query,
                vector_threshold: 0.5,
                vector_count: 5,
                keyword_count: 5,
                final_count: 5
            })
        });

        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            throw new Error(`Supabase Search Failed: ${rpcResponse.status} - ${errorText}`);
        }

        const results = await rpcResponse.json();
        console.log(`SEARCH COMPLETE. Found ${results.length} results.`);
        console.log('--------------------------------------------------');

        if (results.length === 0) {
            console.log('NO RESULTS FOUND.');
        } else {
            results.forEach((item, index) => {
                console.log(`[Result ${index + 1}] (Similarity: ${item.similarity ? item.similarity.toFixed(4) : 'N/A'})`);
                console.log(`Content: ${item.content.substring(0, 150)}...`);
                console.log('--------------------------------------------------');
            });
        }

    } catch (error) {
        console.error('TEST FAILED:', error);
    }
}

// 테스트 실행
// 실제 실행 시에는 아래 주석을 해제하고 터미널에서 환경 변수와 함께 실행해야 합니다.
// 예: $env:SUPABASE_URL="..."; node verify_supabase.js
const testQuery = "레이어드 컷의 특징은 무엇인가요?";
testSupabaseSearch(testQuery);

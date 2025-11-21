// HAIRGATOR AI - 스트리밍 응답 함수 (Supabase 이론 검색 포함)
// 이 함수를 chatbot-api.js 맨 끝에 추가하세요

async function generateProfessionalResponseStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
    const { user_query } = payload;
    console.log('🔄 스트리밍 응답 시작:', user_query);

    const userLanguage = detectLanguage(user_query);

    // 쿼리 정규화
    let normalizedQuery = user_query
        .replace(/A\s*렝스|A\s*랭스|에이\s*렝스|에이\s*랭스|A\s*기장/gi, 'A Length')
        .replace(/B\s*렝스|B\s*랭스|비\s*렝스|비\s*랭스|B\s*기장/gi, 'B Length')
        .replace(/C\s*렝스|C\s*랭스|씨\s*렝스|씨\s*랭스|C\s*기장/gi, 'C Length')
        .replace(/D\s*렝스|D\s*랭스|디\s*렝스|디\s*랭스|D\s*기장/gi, 'D Length')
        .replace(/E\s*렝스|E\s*랭스|이\s*렝스|이\s*랭스|E\s*기장/gi, 'E Length')
        .replace(/F\s*렝스|F\s*랭스|에프\s*렝스|에프\s*랭스|F\s*기장/gi, 'F Length')
        .replace(/G\s*렝스|G\s*랭스|지\s*렝스|지\s*랭스|G\s*기장/gi, 'G Length')
        .replace(/H\s*렝스|H\s*랭스|에이치\s*렝스|에이치\s*랭스|H\s*기장/gi, 'H Length')
        .replace(/레이어|layer/gi, 'Layer')
        .replace(/그래쥬에이션|그라데이션|graduation/gi, 'Graduation');

    // 간단한 인사말 처리
    const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이'];
    const isGreeting = simpleGreetings.some(g => user_query.toLowerCase().trim().includes(g)) && user_query.length < 15;
    if (isGreeting) {
        const msg = '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊';
        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'text/event-stream' },
            body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n`
        };
    }

    // 보안 키워드 체크
    const securityKeywords = ['42포뮬러', '42개 포뮬러', '42 formula', '9매트릭스', '9개 매트릭스', '9 matrix', 'DBS NO', 'DFS NO', 'VS NO', 'HS NO', '42층', '7개 섹션', '7 section'];
    const isSecurityQuery = securityKeywords.some(keyword => user_query.toLowerCase().includes(keyword.toLowerCase()));
    if (isSecurityQuery) {
        const msg = '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.';
        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'text/event-stream' },
            body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n`
        };
    }

    // ⭐⭐⭐ Supabase theory_chunks 검색 ⭐⭐⭐
    console.log('🔍 Supabase 이론 검색 시작:', normalizedQuery);
    const theoryChunks = await searchTheoryChunks(normalizedQuery, geminiKey, supabaseUrl, supabaseKey, 10);
    console.log(`📚 검색된 이론: ${theoryChunks.length}개`);

    // 시스템 프롬프트 빌드
    let systemPrompt;
    if (theoryChunks.length > 0) {
        const theoryContext = theoryChunks.map((chunk, idx) => {
            const title = chunk.section_title || '';
            const content = (chunk.content_ko || chunk.content || '').substring(0, 500);
            return `【참고자료 ${idx + 1}】${title}\n${content}`;
        }).join('\n\n');

        systemPrompt = `당신은 전문 헤어 디자이너입니다. 다음 전문 이론을 바탕으로 질문에 답변하세요.

【전문 이론 자료】
${theoryContext}

위 자료를 참고하여 사용자의 질문에 전문적이고 정확하게 답변하세요. 300자 이내로 간결하게 작성하세요.`;
    } else {
        systemPrompt = '당신은 친절한 헤어 스타일 상담 전문가입니다. 사용자의 질문에 대해 일반적인 헤어스타일 조언을 제공하세요. 200자 이내로 간결하게 답변하세요.';
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: user_query }],
                temperature: 0.3,
                max_tokens: 300,
                stream: true
            })
        });

        if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);

        // Node.js 스트림 처리
        let sseBuffer = '';
        for await (const chunk of response.body) {
            const text = chunk.toString('utf-8');
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const jsonData = line.slice(6);
                        if (jsonData.trim()) {
                            const data = JSON.parse(jsonData);
                            const content = data.choices?.[0]?.delta?.content || '';
                            if (content) sseBuffer += `data: ${JSON.stringify({ type: 'content', content })}\n\n`;
                        }
                    } catch (e) { }
                }
            }
        }
        sseBuffer += 'data: [DONE]\n\n';

        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
            body: sseBuffer
        };
    } catch (error) {
        console.error('💥 스트리밍 오류:', error.message);
        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'text/event-stream' },
            body: `data: ${JSON.stringify({ type: 'error', error: `답변 생성 중 오류: ${error.message}` })}\n\ndata: [DONE]\n\n`
        };
    }
}

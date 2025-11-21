// ========== 스트리밍 응답 핸들러 추가 코드 ==========
// 이 파일의 내용을 chatbot-api.js 맨 끝에 추가하세요

// exports.handler의 switch문에 추가할 케이스:
/*
      case 'generate_response_stream':
        return await generateProfessionalResponseStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
*/

// ========== 함수 정의 ==========

async function generateProfessionalResponseStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
    const { user_query } = payload;
    console.log('🔄 스트리밍 응답 시작:', user_query);

    // 간단한 처리만 - 이론 검색은 나중에
    const userLanguage = detectLanguage(user_query);

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

    // OpenAI 스트리밍 호출
    try {
        const systemPrompt = 'You are aprofessional hair stylist. Answer questions concisely in Korean within 200 characters.';

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: user_query }
                ],
                temperature: 0.3,
                max_tokens: 300,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.status}`);
        }

        // ✅ Node.js 스트림 처리 (for await...of 사용)
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
                            if (content) {
                                sseBuffer += `data: ${JSON.stringify({ type: 'content', content })}\n\n`;
                            }
                        }
                    } catch (e) {
                        // JSON 파싱 실패는 무시
                    }
                }
            }
        }

        sseBuffer += 'data: [DONE]\n\n';

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            body: sseBuffer
        };

    } catch (error) {
        console.error('💥 스트리밍 오류:', error);
        const errorMsg = `답변 생성 중 오류가 발생했습니다. (${error.message})`;
        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'text/event-stream' },
            body: `data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\ndata: [DONE]\n\n`
        };
    }
}

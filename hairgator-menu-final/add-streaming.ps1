# 수동으로 chatbot-api.js에 아래 두 부분만 추가하세요

# 1. exports.handler의 switch문에 추가 (line ~370):
#      case 'generate_response_stream':
#        return await generateProfessionalResponseStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

# 2. 파일 맨 끝에 아래 함수 추가:

Write-Host @"

// ==================== 스트리밍 응답 생성 (Node.js 호환) ====================
async function generateProfessionalResponseStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { user_query } = payload;
  const userLanguage = detectLanguage(user_query);
  
  const simpleGreetings = ['안녕', 'hi', 'hello'];
  const isGreeting = simpleGreetings.some(g => user_query.toLowerCase().includes(g)) && user_query.length < 15;

  if (isGreeting) {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: 'data: ' + JSON.stringify({ type: 'content', content: '안녕하세요! 😊' }) + '\n\ndata: [DONE]\n\n'
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + openaiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: user_query }],
        temperature: 0.3,
        max_tokens: 300,
        stream: true
      })
    });

    if (!response.ok) throw new Error('OpenAI API Error: ' + response.status);

    let sseBuffer = '';
    for await (const chunk of response.body) {
      const text = chunk.toString('utf-8');
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content || '';
            if (content) sseBuffer += 'data: ' + JSON.stringify({ type: 'content', content }) + '\n\n';
          } catch (e) {}
        }
      }
    }
    sseBuffer += 'data: [DONE]\n\n';

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: sseBuffer
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: 'data: ' + JSON.stringify({ type: 'error', error: error.message }) + '\n\ndata: [DONE]\n\n'
    };
  }
}

"@

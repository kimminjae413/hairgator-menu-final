// 배포된 챗봇 API 직접 테스트
require('dotenv').config();

async function testLiveChatbot() {
  console.log('=== 배포된 챗봇 API 테스트 ===\n');

  // Netlify Functions URL (로컬 또는 배포 URL)
  const API_URL = 'https://hairgator-menu-final.netlify.app/.netlify/functions/chatbot-api';

  const queries = [
    "전대각이 뭐야?",
    "후대각 섹션이 뭐야?",
    "전대각과 후대각의 차이점",
    "앞과 뒤를 나누는 기준이 뭐야?"
  ];

  for (const query of queries) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`질문: "${query}"`);
    console.log(`${'─'.repeat(60)}`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_response',
          payload: { user_query: query }
        })
      });

      if (!response.ok) {
        console.log(`API 오류: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.success) {
        console.log('\n📝 챗봇 응답:');
        console.log(data.data);
        console.log(`\n[이론 사용: ${data.theory_used ? '예' : '아니오'}, 청크 수: ${data.theory_count || 0}]`);
      } else {
        console.log('오류:', data.error);
      }

    } catch (err) {
      console.log('요청 오류:', err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== 테스트 완료 ===');
}

testLiveChatbot().catch(console.error);

// 전대각/후대각 이론 데이터 추가
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// 이미지 7장에서 추출한 이론 내용
const diagonalTheoryChunks = [
  {
    section_title: "전대각과 후대각 - 기본 개념",
    main_topic: "전대각 후대각 구분법",
    content_ko: `전대각 후대각, 아직도 헷갈리시나요?

확실한 '기준'만 알고있다면 전혀 헷갈릴 일이 없습니다.

전대각(前斜角): 앞쪽으로 기울어진 시선
후대각(後斜角): 뒤쪽으로 기울어진 시선

단어의 의미만 보면 단순합니다.
시선이 앞으로 기울어졌는지, 뒤로 기울어졌는지에 따라 전대각과 후대각으로 나뉩니다.`,
    keywords: ["전대각", "후대각", "기본개념", "시선", "기울기", "diagonal forward", "diagonal backward", "섹션 구분"],
    sub_category: "cutting_theory_basics",
    importance_level: 10,
    chunk_type: "definition"
  },
  {
    section_title: "전대각과 후대각 - 앞과 뒤를 나누는 기준",
    main_topic: "전대각 후대각 기준점",
    content_ko: `'앞'과 '뒤'를 나누는 기준

헤어디자인에서 '앞'과 '뒤'를 나누는 기준은 '얼굴'입니다.

즉, 얼굴이 향한쪽을 '앞'이라 하며
뒤통수 방향은 '뒤'가 됩니다.

이는 와인딩에서 포워드/리버스, 오버다이렉션에서 포워드팩/백 역시 마찬가지입니다.

얼굴 방향 = 앞(Forward)
뒤통수 방향 = 뒤(Backward)`,
    keywords: ["전대각", "후대각", "기준", "얼굴", "앞", "뒤", "포워드", "리버스", "forward", "backward", "오버다이렉션"],
    sub_category: "cutting_theory_basics",
    importance_level: 10,
    chunk_type: "definition"
  },
  {
    section_title: "전대각과 후대각 - 기울어진 방향",
    main_topic: "섹션 기울기 방향 판단",
    content_ko: `기울어진 방향

앞과 뒤의 기준을 알았다면 이제는 '방향'의 기준을 파악해야 합니다.

앞과 뒤를 구분할 수 있어도, 흐르는 방향이 명확하지 않다면 그 시선이 전대각인지 후대각인지 판단할 수 없습니다.

섹션이 어느 방향으로 기울어졌는지 판단하는 것이 중요합니다.`,
    keywords: ["전대각", "후대각", "방향", "기울기", "섹션", "시선", "판단", "흐름"],
    sub_category: "cutting_theory_basics",
    importance_level: 9,
    chunk_type: "concept"
  },
  {
    section_title: "전대각과 후대각 - 중력의 개념 적용",
    main_topic: "중력을 이용한 방향 판단",
    content_ko: `'중력'의 개념을 적용

여기에 중력의 개념을 적용한다면 보다 수월합니다.

우리가 머리선을 나눌 때 위에서 아래로 빗질하는 이유도 중력 방향이 가장 자연스럽고 정확한 머리선을 만들 수 있기 때문입니다.

즉, 중력을 따라 흐르는 방향, 바로 위에서 아래로 떨어지는 방향이 기준점입니다.

중력 방향(위→아래)을 기준으로:
- 앞쪽(얼굴방향)으로 기울어짐 = 전대각
- 뒤쪽(뒤통수방향)으로 기울어짐 = 후대각`,
    keywords: ["전대각", "후대각", "중력", "방향", "기준점", "위에서 아래", "자연스러운", "빗질", "머리선"],
    sub_category: "cutting_theory_basics",
    importance_level: 10,
    chunk_type: "concept"
  },
  {
    section_title: "전대각 섹션 (Diagonal Forward Section)",
    main_topic: "전대각 섹션 정의",
    content_ko: `전대각 섹션 (Diagonal Forward Section, DFS)

전대각 섹션은 중력선(수직선)을 기준으로 앞쪽(얼굴 방향)으로 기울어진 섹션입니다.

특징:
- 시선이 얼굴 방향으로 향함
- 앞머리가 짧고 뒤로 갈수록 길어지는 형태 생성
- 볼륨이 앞쪽에 집중
- 코너(Corner) 부분을 정리할 때 주로 사용
- 얼굴 라인을 강조하는 효과

전대각 섹션으로 커트하면 무게감이 앞쪽으로 이동하여 얼굴을 감싸는 느낌을 줍니다.`,
    keywords: ["전대각", "전대각 섹션", "diagonal forward", "DFS", "앞쪽", "얼굴 방향", "코너", "볼륨", "무게감"],
    sub_category: "cutting_theory_basics",
    importance_level: 10,
    chunk_type: "definition"
  },
  {
    section_title: "후대각 섹션 (Diagonal Backward Section)",
    main_topic: "후대각 섹션 정의",
    content_ko: `후대각 섹션 (Diagonal Backward Section, DBS)

후대각 섹션은 중력선(수직선)을 기준으로 뒤쪽(뒤통수 방향)으로 기울어진 섹션입니다.

특징:
- 시선이 뒤통수 방향으로 향함
- 앞이 길고 뒤로 갈수록 짧아지는 형태 생성
- 무게감이 뒤쪽으로 분산
- 길이(Length)를 조절할 때 주로 사용
- 뒷모습을 강조하는 효과

후대각 섹션으로 커트하면 무게감이 뒤쪽으로 이동하여 뒷모습이 풍성해 보입니다.`,
    keywords: ["후대각", "후대각 섹션", "diagonal backward", "DBS", "뒤쪽", "뒤통수 방향", "길이", "무게감", "볼륨"],
    sub_category: "cutting_theory_basics",
    importance_level: 10,
    chunk_type: "definition"
  },
  {
    section_title: "전대각 vs 후대각 비교",
    main_topic: "전대각 후대각 차이점",
    content_ko: `전대각 vs 후대각 비교

| 구분 | 전대각 (Diagonal Forward) | 후대각 (Diagonal Backward) |
|------|--------------------------|---------------------------|
| 기울기 방향 | 얼굴 방향 (앞쪽) | 뒤통수 방향 (뒤쪽) |
| 약자 | DFS | DBS |
| 길이 변화 | 앞이 짧고 뒤가 김 | 앞이 길고 뒤가 짧음 |
| 무게 이동 | 앞쪽으로 집중 | 뒤쪽으로 분산 |
| 주요 용도 | 코너 정리, 얼굴 라인 강조 | 길이 조절, 볼륨 조절 |
| 시각 효과 | 얼굴을 감싸는 느낌 | 뒷모습 풍성함 |

커트 시 전대각과 후대각을 적절히 조합하면 원하는 실루엣과 볼륨을 만들 수 있습니다.`,
    keywords: ["전대각", "후대각", "비교", "차이점", "DFS", "DBS", "무게 이동", "길이 변화", "볼륨"],
    sub_category: "cutting_theory_basics",
    importance_level: 10,
    chunk_type: "comparison"
  }
];

// Gemini 임베딩 생성 함수
async function generateEmbedding(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function addDiagonalTheory() {
  console.log('=== 전대각/후대각 이론 데이터 추가 ===\n');

  for (let i = 0; i < diagonalTheoryChunks.length; i++) {
    const chunk = diagonalTheoryChunks[i];
    console.log(`\n${i + 1}/${diagonalTheoryChunks.length}. ${chunk.section_title}`);

    try {
      // 1. 임베딩 생성
      console.log('   → 임베딩 생성 중...');
      const embeddingText = `${chunk.section_title} ${chunk.main_topic} ${chunk.content_ko}`;
      const embedding = await generateEmbedding(embeddingText);
      console.log(`   ✅ 임베딩 생성 완료 (${embedding.length}차원)`);

      // 2. Supabase에 삽입
      const insertData = {
        category_code: 'cutting_techniques',
        sub_category: chunk.sub_category,
        section_title: chunk.section_title,
        main_topic: chunk.main_topic,
        content: chunk.content_ko,
        content_ko: chunk.content_ko,
        content_length: chunk.content_ko.length,
        keywords: chunk.keywords,
        importance_level: chunk.importance_level,
        chunk_type: chunk.chunk_type,
        is_verified: true,
        quality_score: 1.0,
        embedding: JSON.stringify(embedding),  // 문자열로 저장 (기존 형식 따름)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('theory_chunks')
        .insert(insertData)
        .select('id');

      if (error) {
        console.log(`   ❌ 삽입 오류: ${error.message}`);
      } else {
        console.log(`   ✅ 삽입 완료 (ID: ${data[0].id})`);
      }

      // API 속도 제한 방지
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.log(`   ❌ 오류: ${err.message}`);
    }
  }

  console.log('\n=== 완료 ===');

  // 확인
  console.log('\n=== 삽입된 데이터 확인 ===\n');

  const { data: verifyData } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content_ko')
    .ilike('section_title', '%전대각%')
    .order('id', { ascending: false })
    .limit(10);

  verifyData?.forEach((item, i) => {
    console.log(`${i + 1}. [ID: ${item.id}] ${item.section_title}`);
    console.log(`   ${item.content_ko?.substring(0, 80)}...`);
  });
}

addDiagonalTheory().catch(console.error);

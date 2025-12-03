// lib/utils.js
// 공통 유틸리티 함수

// ==================== 언어 감지 ====================
function detectLanguage(text) {
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  if (koreanRegex.test(text)) return 'korean';

  const vietnameseRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseRegex.test(text)) return 'vietnamese';

  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (japaneseRegex.test(text)) return 'japanese';

  const chineseRegex = /[\u4E00-\u9FFF]/;
  if (chineseRegex.test(text)) return 'chinese';

  return 'english';
}

// ==================== 인사말 처리 ====================
const SIMPLE_GREETINGS = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워', '여보세요'];

function isSimpleGreeting(query) {
  const lowerQuery = query.toLowerCase().trim();
  return SIMPLE_GREETINGS.some(g => {
    return lowerQuery === g ||
      lowerQuery === g + '하세요' ||
      lowerQuery === g + '!' ||
      lowerQuery === g + '?';
  }) && query.length < 15;
}

function getGreetingResponse(language) {
  const responses = {
    korean: '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊\n\n예시:\n• "렝스별로 설명해줘"\n• "레이어드 컷이 뭐야?"\n• "G Length가 뭐야?"\n• "얼굴형에 맞는 스타일 추천해줘"',
    english: 'Hello! Feel free to ask anything about hairstyles. 😊\n\nExamples:\n• "Explain length categories"\n• "What is layered cut?"\n• "Recommend styles for my face shape"',
    japanese: 'こんにちは！ヘアスタイルについて何でも聞いてください。😊',
    chinese: '你好！请随便问关于发型的问题。😊',
    vietnamese: 'Xin chào! Hỏi gì về kiểu tóc cũng được. 😊'
  };
  return responses[language] || responses['korean'];
}

// ==================== 보안 필터링 ====================
const SECURITY_KEYWORDS = [
  '42포뮬러', '42개 포뮬러', '42 formula', '42공식', '42가지', '42개의',
  'forty two', 'fortytwo', '포뮬러 원리', 'formula 원리', '공식 원리',
  '42가지 공식', '42개 공식', '42종', '42종류',
  '9매트릭스', '9개 매트릭스', '9 matrix', '나인매트릭스', 'nine matrix',
  'DBS NO', 'DFS NO', 'VS NO', 'HS NO',
  'dbs no', 'dfs no', 'vs no', 'hs no',
  '42층', '7개 섹션', '7 section'
];

function isSecurityQuery(query) {
  const lowerQuery = query.toLowerCase();
  return SECURITY_KEYWORDS.some(keyword =>
    lowerQuery.includes(keyword.toLowerCase())
  );
}

function getSecurityResponse(language) {
  const responses = {
    korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.\n\n대신 이런 질문은 어떠세요?\n• "레이어 컷의 기본 원리는?"\n• "얼굴형별 추천 스타일"\n• "헤어 길이 분류 시스템"',
    english: 'I apologize, but that information is proprietary to the 2WAY CUT system.\n\nHow about these questions instead?\n• "Basic principles of layer cut"\n• "Recommended styles by face shape"',
    japanese: '申し訳ございませんが、その情報は企業秘密です。',
    chinese: '抱歉，该信息属于核心商业机密。',
    vietnamese: 'Xin lỗi, thông tin đó là bí mật kinh doanh.'
  };
  return responses[language] || responses['korean'];
}

// ==================== 레시피 보안 필터링 ====================
function sanitizeRecipeForPublic(recipe, language = 'ko') {
  if (!recipe) return recipe;

  let filtered = recipe;

  // 섹션 코드 치환
  filtered = filtered.replace(/DBS\s+NO\.\s*\d+/gi, '뒷머리 기법');
  filtered = filtered.replace(/DFS\s+NO\.\s*\d+/gi, '앞머리 기법');
  filtered = filtered.replace(/VS\s+NO\.\s*\d+/gi, '중앙 기법');
  filtered = filtered.replace(/HS\s+NO\.\s*\d+/gi, '상단 기법');
  filtered = filtered.replace(/UP[\s-]?STEM\s+NO\.\s*\d+/gi, '정수리 기법');
  filtered = filtered.replace(/NAPE\s+ZONE\s+NO\.\s*\d+/gi, '목 부위 기법');

  // 섹션 용어 치환
  filtered = filtered.replace(/가로섹션|Horizontal\s+Section/gi, '상단 부분');
  filtered = filtered.replace(/후대각섹션|Diagonal\s+Backward\s+Section/gi, '뒷머리 부분');
  filtered = filtered.replace(/전대각섹션|Diagonal\s+Forward\s+Section/gi, '앞쪽 부분');
  filtered = filtered.replace(/세로섹션|Vertical\s+Section/gi, '중앙 부분');
  filtered = filtered.replace(/네이프존|Nape\s+Zone/gi, '목 부위');
  filtered = filtered.replace(/업스템|Up[\s-]?Stem/gi, '정수리 부분');
  filtered = filtered.replace(/백존|Back\s+Zone/gi, '후면 부분');

  // 기술 코드 치환
  filtered = filtered.replace(/L[0-8]\s*\([^)]+\)/gi, '적절한 각도로');
  filtered = filtered.replace(/D[0-8]\s*\([^)]+\)/gi, '자연스러운 방향으로');

  // IP 보호
  filtered = filtered.replace(/42층|42\s+layers?|42-layer/gi, '전문적인 층 구조');
  filtered = filtered.replace(/\d+층\s+구조/gi, '체계적인 층 구조');
  filtered = filtered.replace(/9개\s+매트릭스|9\s+matrix|nine\s+matrix/gi, '체계적인 분류');
  filtered = filtered.replace(/매트릭스\s+코드|matrix\s+code/gi, '스타일 분류');
  filtered = filtered.replace(/7개\s+섹션|7개\s+존|7\s+section|7\s+zone/gi, '여러 부분');

  // 출처 제거
  filtered = filtered.replace(/\(Book\s+[A-E],\s+p\.\s*\d+\)/gi, '');
  filtered = filtered.replace(/\(2WAY\s+CUT\s+Book\s+[A-E],\s+Page\s+\d+\)/gi, '');

  return filtered;
}

// ==================== 쿼리 정규화 ====================
function normalizeQuery(query) {
  return query
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
}

// ==================== 언어별 용어 ====================
function getTerms(lang) {
  const terms = {
    ko: {
      lengthDesc: {
        'A Length': '가슴 아래 밑선',
        'B Length': '가슴 상단~중간',
        'C Length': '쇄골 밑선',
        'D Length': '어깨선',
        'E Length': '어깨 위 2-3cm',
        'F Length': '턱뼈 아래',
        'G Length': '턱선',
        'H Length': '귀 높이'
      },
      faceShapeDesc: {
        'Oval': '계란형',
        'Round': '둥근형',
        'Square': '사각형',
        'Heart': '하트형',
        'Long': '긴 얼굴형',
        'Diamond': '다이아몬드형'
      },
      formDesc: {
        'O': 'One Length, 원렝스',
        'G': 'Graduation, 그래쥬에이션',
        'L': 'Layer, 레이어'
      },
      volume: {
        'Low': '하단 볼륨 (0~44도)',
        'Medium': '중단 볼륨 (45~89도)',
        'High': '상단 볼륨 (90도 이상)'
      }
    },
    en: {
      lengthDesc: {
        'A Length': 'Below chest',
        'B Length': 'Mid-chest (bra line)',
        'C Length': 'Below collarbone',
        'D Length': 'Shoulder line',
        'E Length': '2-3cm above shoulder',
        'F Length': 'Below jaw',
        'G Length': 'Jaw line',
        'H Length': 'Ear level'
      },
      faceShapeDesc: {
        'Oval': 'Oval',
        'Round': 'Round',
        'Square': 'Square',
        'Heart': 'Heart',
        'Long': 'Long',
        'Diamond': 'Diamond'
      },
      formDesc: {
        'O': 'One Length',
        'G': 'Graduation',
        'L': 'Layer'
      },
      volume: {
        'Low': 'Low volume (0-44°)',
        'Medium': 'Medium volume (45-89°)',
        'High': 'High volume (90°+)'
      }
    }
  };

  return terms[lang] || terms['ko'];
}

// ==================== 코사인 유사도 계산 ====================
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// ==================== 리프팅 각도 → 볼륨 계산 ====================
function calculateVolumeFromLifting(liftingCode) {
  const angles = {
    'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5,
    'L4': 90, 'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180
  };

  const angle = angles[liftingCode] || 0;

  if (angle < 45) return 'Low';
  if (angle < 90) return 'Medium';
  return 'High';
}

// ==================== 검색 쿼리 빌드 ====================
function buildSearchQuery(params56) {
  const parts = [];

  if (params56.length_category) {
    const lengthMap = {
      'A Length': '가슴 아래 롱헤어',
      'B Length': '가슴 세미롱',
      'C Length': '쇄골 세미롱',
      'D Length': '어깨선 미디엄',
      'E Length': '어깨 위 단발',
      'F Length': '턱선 보브',
      'G Length': '짧은 보브',
      'H Length': '베리숏'
    };
    parts.push(lengthMap[params56.length_category]);
  }

  if (params56.cut_form) {
    const form = params56.cut_form.replace(/[()]/g, '').trim();
    parts.push(form);
  }

  if (params56.lifting_range && params56.lifting_range.length > 0) {
    parts.push(`리프팅 ${params56.lifting_range.join(' ')}`);
  }

  if (params56.section_primary) {
    parts.push(`섹션 ${params56.section_primary}`);
  }

  if (params56.volume_zone) {
    parts.push(`${params56.volume_zone} 볼륨`);
  }

  if (params56.fringe_type && params56.fringe_type !== 'No Fringe') {
    parts.push(params56.fringe_type);
  }

  return parts.join(', ');
}

// ==================== 길이 프리픽스 매핑 ====================
const LENGTH_TO_SERIES = {
  'A Length': 'FAL',
  'B Length': 'FBL',
  'C Length': 'FCL',
  'D Length': 'FDL',
  'E Length': 'FEL',
  'F Length': 'FFL',
  'G Length': 'FGL',
  'H Length': 'FHL'
};

function getLengthPrefix(lengthCategory) {
  return LENGTH_TO_SERIES[lengthCategory] || null;
}

// ==================== 남자 스타일 코드 매핑 ====================
const MALE_STYLE_TO_CODE = {
  'Side Fringe': 'SF',
  'Side Part': 'SP',
  'Fringe Up': 'FU',
  'Pushed Back': 'PB',
  'Buzz Cut': 'BZ',
  'Crop Cut': 'CP',
  'Mohican': 'MC'
};

function getMaleStyleCode(styleName) {
  return MALE_STYLE_TO_CODE[styleName] || null;
}

module.exports = {
  detectLanguage,
  isSimpleGreeting,
  getGreetingResponse,
  isSecurityQuery,
  getSecurityResponse,
  sanitizeRecipeForPublic,
  normalizeQuery,
  getTerms,
  cosineSimilarity,
  calculateVolumeFromLifting,
  buildSearchQuery,
  getLengthPrefix,
  getMaleStyleCode,
  LENGTH_TO_SERIES,
  MALE_STYLE_TO_CODE
};

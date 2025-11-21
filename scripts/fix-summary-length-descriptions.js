// scripts/fix-summary-length-descriptions.js
// TSV 파일의 잘못된 길이 표현을 올바른 표현으로 수정

const fs = require('fs');
const path = require('path');

// 올바른 길이 매핑
const lengthMapping = {
  'A': {
    wrong: ['어깨 길이', '어깨'],
    correct: '가슴 아래'
  },
  'B': {
    wrong: [],
    correct: '가슴'  // 이미 대부분 맞음
  },
  'C': {
    wrong: [],
    correct: '쇄골'  // 이미 맞음
  },
  'D': {
    wrong: ['턱 아래'],
    correct: '어깨선'
  },
  'E': {
    wrong: ['귀 길이', '귀'],
    correct: '어깨 위'
  },
  'F': {
    wrong: ['이마 길이', '이마'],
    correct: '턱선'
  },
  'G': {
    wrong: ['매우 긴', '허리', '허리 길이'],  // FGL이 "매우 긴"으로 잘못됨
    correct: '짧은 보브'
  },
  'H': {
    wrong: ['허리 길이', '허리'],  // FHL이 "허리 길이"로 잘못됨
    correct: '베리숏'
  }
};

// 길이 설명 -> 정확한 한국어 표현
const lengthDescriptions = {
  'A': '가슴 아래 롱헤어',
  'B': '가슴 세미롱',
  'C': '쇄골 세미롱',
  'D': '어깨선 미디엄',
  'E': '어깨 위 단발',
  'F': '턱선 보브',
  'G': '짧은 보브',
  'H': '베리숏'
};

function fixLengthDescription(summary, lengthCode) {
  let fixed = summary;

  const mapping = lengthMapping[lengthCode];
  if (!mapping) return fixed;

  // 각 길이 코드에 맞는 전체 재작성
  // 너무 많은 잘못된 표현이 섞여 있어서 패턴 교체보다는 재작성이 필요

  // 간단한 패턴 매칭으로 스타일 요소 추출
  const hasLayer = /레이어/.test(summary);
  const hasGradation = /그라데이션/.test(summary);
  const has앞머리 = /앞머리/.test(summary);
  const hasDisconnection = /디스커넥션/.test(summary);
  const has스퀘어 = /스퀘어/.test(summary);
  const has원랭스 = /원랭스/.test(summary);
  const has둥근 = /둥근/.test(summary);

  // 길이 표현만 정확히 교체
  const correctLength = mapping.correct;

  // 잘못된 길이 표현 제거 (순서대로)
  for (const wrongTerm of mapping.wrong) {
    fixed = fixed.replace(new RegExp(wrongTerm + '\\s*(길이\\s*)?', 'g'), correctLength + ' ');
  }

  // G (짧은 보브), H (베리숏)의 경우 모순되는 "롱헤어", "긴 머리" 표현 제거
  if (lengthCode === 'G' || lengthCode === 'H') {
    // "롱헤어"를 적절한 표현으로 변경
    fixed = fixed.replace(/롱헤어/g, lengthCode === 'G' ? '보브' : '숏컷');
    // "긴 머리"를 적절한 표현으로 변경
    fixed = fixed.replace(/긴\s*머리/g, lengthCode === 'G' ? '보브 컷' : '짧은 컷');
  }

  // "짧은 보브생머리" 같은 문제 수정 - 공백 추가
  fixed = fixed.replace(/(보브|롱헤어|미디엄|단발)([가-힣])/g, '$1 $2');

  // 중복 공백 제거
  fixed = fixed.replace(/\s+/g, ' ').trim();

  return fixed;
}

function processTSVFile(inputPath, outputPath) {
  console.log(`📖 TSV 파일 읽는 중: ${inputPath}\n`);

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.trim().split('\n');

  const header = lines[0];
  const results = [header];

  let fixedCount = 0;
  let unchangedCount = 0;

  console.log('🔧 길이 표현 수정 중...\n');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const [sample_code, recipe_summary_ko] = line.split('\t');

    if (!sample_code || !recipe_summary_ko) {
      results.push(line);
      continue;
    }

    // sample_code에서 길이 코드 추출 (세 번째 문자)
    // 예: FAL0001 -> A, FGL1013 -> G
    const lengthCode = sample_code.charAt(1);

    const originalSummary = recipe_summary_ko.trim();
    const fixedSummary = fixLengthDescription(originalSummary, lengthCode);

    if (originalSummary !== fixedSummary) {
      console.log(`✏️  ${sample_code}:`);
      console.log(`   이전: ${originalSummary}`);
      console.log(`   수정: ${fixedSummary}\n`);
      fixedCount++;
    } else {
      unchangedCount++;
    }

    results.push(`${sample_code}\t${fixedSummary}`);
  }

  // 수정된 내용 저장
  fs.writeFileSync(outputPath, results.join('\n') + '\n', 'utf8');

  console.log('='.repeat(60));
  console.log(`📊 처리 완료!`);
  console.log(`- 수정됨: ${fixedCount}개`);
  console.log(`- 변경 없음: ${unchangedCount}개`);
  console.log(`- 총: ${fixedCount + unchangedCount}개`);
  console.log(`\n✅ 저장됨: ${outputPath}`);
}

// 여성 컷 TSV 파일 처리
const inputPath = path.join(__dirname, '..', 'data', 'recipe-summaries-female-cut-v2.tsv');
const outputPath = path.join(__dirname, '..', 'data', 'recipe-summaries-female-cut-v3-fixed.tsv');

processTSVFile(inputPath, outputPath);

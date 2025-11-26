// scripts/execute-embedding-fix.js
// SQL 스크립트를 자동으로 Supabase에 실행

const fs = require('fs');
const path = require('path');
const https = require('https');

// .env 파일 파싱
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY;

// SQL 파일 읽기
const sqlPath = path.join(__dirname, 'fix-embedding-columns.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// SQL을 개별 statement로 분리 (주석 제거, BEGIN/COMMIT 단위로 분리)
function parseSqlStatements(sql) {
  // 주석 제거
  let cleaned = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // /* */ 주석 제거
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // BEGIN...COMMIT 블록 추출
  const statements = [];
  const beginRegex = /BEGIN;[\s\S]*?COMMIT;/gi;
  let match;

  while ((match = beginRegex.exec(cleaned)) !== null) {
    statements.push(match[0]);
  }

  // 나머지 독립 statement 추가 (CREATE EXTENSION, SELECT 등)
  const remaining = cleaned.replace(/BEGIN;[\s\S]*?COMMIT;/gi, '');
  const lines = remaining.split(';').filter(line => line.trim().length > 10);

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('/*')) {
      statements.push(trimmed + ';');
    }
  });

  return statements;
}

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    // Supabase는 직접 SQL 실행을 지원하지 않음
    // 대신 PostgREST API를 사용해야 하므로, 수동 실행을 권장합니다
    reject(new Error('Supabase는 REST API로 직접 SQL을 실행할 수 없습니다. 대시보드를 사용하세요.'));
  });
}

async function main() {
  console.log('🔧 임베딩 컬럼 타입 수정 스크립트\n');
  console.log('='.repeat(80));
  console.log('\n⚠️  중요: Supabase는 REST API를 통한 DDL 실행을 지원하지 않습니다.');
  console.log('\n📋 다음 방법 중 하나를 선택하세요:\n');

  console.log('방법 1: Supabase 대시보드 (권장) ✅');
  console.log('   1. https://bhsbwbeisqzgipvzpvym.supabase.co 접속');
  console.log('   2. 좌측 메뉴에서 "SQL Editor" 클릭');
  console.log('   3. fix-embedding-columns.sql 파일 내용 복사');
  console.log('   4. SQL Editor에 붙여넣기 후 "Run" 버튼 클릭\n');

  console.log('방법 2: psql 명령어 (고급 사용자)');
  console.log('   psql "postgresql://postgres:[PASSWORD]@db.bhsbwbeisqzgipvzpvym.supabase.co:5432/postgres" -f fix-embedding-columns.sql\n');

  console.log('='.repeat(80));
  console.log('\n📄 SQL 파일 경로:');
  console.log(`   ${sqlPath}\n`);

  console.log('📊 SQL 스크립트 내용 미리보기:\n');
  const statements = parseSqlStatements(sqlContent);
  console.log(`   총 ${statements.length}개의 SQL statement 포함`);
  console.log('   - pgvector extension 활성화');
  console.log('   - recipe_samples: 3개 컬럼 변환');
  console.log('   - theory_chunks: 2개 컬럼 변환');
  console.log('   - hairstyles: 1개 컬럼 변환');
  console.log('   - 인덱스 자동 생성');
  console.log('   - 변환 결과 확인 쿼리\n');

  console.log('='.repeat(80));
  console.log('\n💡 다음 단계:');
  console.log('   1. Supabase 대시보드에서 SQL 실행');
  console.log('   2. node scripts/verify-embedding-fix.js 실행하여 검증');
  console.log('   3. 챗봇 기능 테스트\n');
}

main().catch(console.error);

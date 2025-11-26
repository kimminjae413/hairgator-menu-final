// scripts/check-current-state.js
// 현재 recipe_samples 테이블의 컬럼 상태 확인

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

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

async function checkState() {
  console.log('🔍 현재 테이블 상태 확인 중...\n');
  console.log('='.repeat(80));

  try {
    const url = `${SUPABASE_URL}/rest/v1/recipe_samples?select=*&limit=1`;
    const data = await httpsGet(url);

    if (data.length > 0) {
      const sample = data[0];
      const columns = Object.keys(sample);

      console.log('\n📊 recipe_samples 테이블의 모든 컬럼:\n');

      // 임베딩 관련 컬럼만 필터링
      const embeddingCols = columns.filter(col =>
        col.includes('embedding') || col.includes('vector')
      );

      console.log('🔹 임베딩 관련 컬럼:\n');

      embeddingCols.forEach(col => {
        const value = sample[col];
        const type = value === null
          ? 'NULL'
          : Array.isArray(value)
            ? `Array[${value.length}]`
            : typeof value === 'string'
              ? `String[${value.length}자]`
              : typeof value;

        console.log(`   ${col.padEnd(35)} : ${type}`);

        if (typeof value === 'string' && value.length > 0) {
          console.log(`      → 앞 50자: ${value.substring(0, 50)}...`);
        }
      });

      console.log('\n' + '='.repeat(80));
      console.log('\n💡 판단:\n');

      // 백업 컬럼 존재 여부 확인
      const hasBackup = embeddingCols.some(col => col.includes('backup'));

      if (hasBackup) {
        console.log('   ✅ 백업 컬럼이 존재합니다 (첫 번째 SQL이 부분적으로 실행됨)');
        console.log('   → 다음: 롤백 후 새로운 SQL 실행 필요\n');
      } else {
        console.log('   ℹ️  백업 컬럼이 없습니다 (원본 상태)');
        console.log('   → 다음: 새로운 SQL 실행 가능\n');
      }

      // 권장 조치
      console.log('='.repeat(80));
      console.log('\n📋 권장 조치:\n');

      if (hasBackup) {
        console.log('   1. scripts/rollback-embedding-changes.sql 실행 (원상복구)');
        console.log('   2. scripts/fix-embedding-columns-v3.sql 실행 (새로운 수정 스크립트)\n');
      } else {
        console.log('   1. scripts/fix-embedding-columns-v3.sql 실행\n');
      }

    } else {
      console.log('❌ 데이터가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

checkState();

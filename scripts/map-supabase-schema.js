// scripts/map-supabase-schema.js
// Supabase 전체 데이터베이스 구조 파악

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
          resolve({ body, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

async function mapSchema() {
  console.log('🗺️  Supabase 데이터베이스 구조 매핑 시작...\n');
  console.log('='.repeat(80));

  try {
    // 1. 모든 테이블 목록 가져오기 (PostgREST introspection)
    console.log('\n📋 1. 사용 가능한 테이블 목록:\n');

    const tablesResponse = await httpsGet(`${SUPABASE_URL}/rest/v1/`);
    const openApiSpec = JSON.parse(tablesResponse.body);

    const tables = Object.keys(openApiSpec.definitions || {}).filter(name =>
      !name.startsWith('rpc_') && !name.startsWith('_')
    );

    tables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table}`);
    });

    // 2. 각 테이블의 컬럼 구조 확인
    console.log('\n\n📊 2. 각 테이블의 컬럼 구조:\n');
    console.log('='.repeat(80));

    for (const table of tables) {
      console.log(`\n🔹 테이블: ${table}`);
      console.log('-'.repeat(80));

      try {
        // 빈 쿼리로 컬럼 정보만 가져오기
        const url = `${SUPABASE_URL}/rest/v1/${table}?limit=1`;
        const response = await httpsGet(url);
        const data = JSON.parse(response.body);

        if (data.length > 0) {
          const sample = data[0];
          const columns = Object.keys(sample);

          console.log(`   컬럼 개수: ${columns.length}개\n`);

          columns.forEach(col => {
            const value = sample[col];
            const type = Array.isArray(value)
              ? `Array[${value.length}]`
              : typeof value;
            const preview = value === null
              ? 'NULL'
              : typeof value === 'string' && value.length > 50
                ? value.substring(0, 50) + '...'
                : JSON.stringify(value).substring(0, 50);

            console.log(`   - ${col.padEnd(30)} | ${type.padEnd(15)} | ${preview}`);
          });
        } else {
          console.log('   (데이터 없음)');
        }

        // Rate limit 방지
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.log(`   ⚠️  조회 실패: ${error.message}`);
      }
    }

    // 3. RPC 함수 목록
    console.log('\n\n🔧 3. RPC 함수 목록:\n');
    console.log('='.repeat(80));

    const rpcFunctions = Object.keys(openApiSpec.paths || {})
      .filter(path => path.startsWith('/rpc/'))
      .map(path => path.replace('/rpc/', ''));

    if (rpcFunctions.length > 0) {
      rpcFunctions.forEach((func, idx) => {
        console.log(`   ${idx + 1}. ${func}`);
      });
    } else {
      console.log('   (RPC 함수 발견 안됨)');
    }

    // 4. 임베딩 관련 컬럼 찾기
    console.log('\n\n🔍 4. 임베딩 관련 컬럼 검색:\n');
    console.log('='.repeat(80));

    for (const table of tables) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/${table}?limit=1`;
        const response = await httpsGet(url);
        const data = JSON.parse(response.body);

        if (data.length > 0) {
          const sample = data[0];
          const embeddingCols = Object.keys(sample).filter(col =>
            col.includes('embedding') || col.includes('vector')
          );

          if (embeddingCols.length > 0) {
            console.log(`\n🔹 ${table}:`);
            embeddingCols.forEach(col => {
              const value = sample[col];
              const type = typeof value;
              const info = value === null
                ? 'NULL'
                : Array.isArray(value)
                  ? `Array[${value.length}차원]`
                  : type === 'string'
                    ? `String[${value.length}자]`
                    : type;

              console.log(`   - ${col}: ${info}`);

              // String인 경우 JSON 파싱 시도
              if (type === 'string' && value) {
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    console.log(`     → JSON 파싱 가능, 실제로는 Array[${parsed.length}차원]`);
                  }
                } catch (e) {
                  console.log(`     → JSON 파싱 불가능`);
                }
              }
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        // Skip errors
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ 스키마 매핑 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
mapSchema();

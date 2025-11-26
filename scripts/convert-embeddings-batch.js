// scripts/convert-embeddings-batch.js
// TEXT 타입 임베딩을 VECTOR 타입으로 안전하게 배치 변환

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

const BATCH_SIZE = 100; // 100개씩 처리
const DELAY_MS = 500;   // 배치 간 대기 시간

// HTTP 요청 헬퍼
function httpsRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// 배치 변환 함수
async function convertTableEmbeddings(tableName, columns, vectorSizes) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 테이블: ${tableName}`);
  console.log(`${'='.repeat(80)}\n`);

  for (const column of columns) {
    const vectorSize = vectorSizes[column];
    const newColumn = `${column}_vector`;

    console.log(`\n🔄 컬럼: ${column} → ${newColumn} (${vectorSize}차원)\n`);

    let offset = 0;
    let totalConverted = 0;
    let errors = 0;

    while (true) {
      try {
        // 1. 데이터 가져오기
        const selectUrl = `${SUPABASE_URL}/rest/v1/${tableName}?select=id,${column}&${column}=not.is.null&limit=${BATCH_SIZE}&offset=${offset}`;
        const rows = await httpsRequest(selectUrl, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });

        if (!rows || rows.length === 0) {
          console.log(`   ✅ 완료! 총 ${totalConverted}개 변환, ${errors}개 오류\n`);
          break;
        }

        // 2. 각 행 변환 및 업데이트
        for (const row of rows) {
          try {
            // TEXT를 Array로 변환
            let embedding;
            if (typeof row[column] === 'string') {
              embedding = JSON.parse(row[column]);
            } else if (Array.isArray(row[column])) {
              embedding = row[column]; // 이미 배열
            } else {
              console.log(`   ⚠️  ID ${row.id}: 알 수 없는 타입, 건너뜀`);
              continue;
            }

            // 차원 검증
            if (embedding.length !== vectorSize) {
              console.log(`   ⚠️  ID ${row.id}: 차원 불일치 (${embedding.length} != ${vectorSize}), 건너뜀`);
              continue;
            }

            // 새 컬럼에 업데이트
            const updateUrl = `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${row.id}`;
            await httpsRequest(updateUrl, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              }
            }, {
              [newColumn]: embedding
            });

            totalConverted++;

            if (totalConverted % 10 === 0) {
              process.stdout.write(`\r   진행: ${totalConverted}개 변환됨...`);
            }

          } catch (error) {
            errors++;
            console.log(`\n   ❌ ID ${row.id}: ${error.message}`);
          }
        }

        offset += BATCH_SIZE;

        // 배치 간 대기
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

      } catch (error) {
        console.log(`\n   ❌ 배치 조회 오류 (offset ${offset}): ${error.message}`);
        break;
      }
    }
  }
}

// 메인 실행
async function main() {
  console.log('🚀 임베딩 타입 변환 시작\n');
  console.log('전략: TEXT 컬럼 → 새로운 VECTOR 컬럼 생성\n');
  console.log('⚠️  참고: 먼저 Supabase SQL Editor에서 새 컬럼을 생성해야 합니다!\n');

  console.log('✅ Step 1이 완료되었다고 가정하고 변환을 시작합니다.\n');

  try {
    // 1. recipe_samples
    await convertTableEmbeddings('recipe_samples',
      ['image_embedding', 'recipe_embedding', 'summary_embedding'],
      {
        'image_embedding': 768,
        'recipe_embedding': 768,
        'summary_embedding': 768
      }
    );

    // 2. theory_chunks
    await convertTableEmbeddings('theory_chunks',
      ['embedding', 'image_embedding'],
      {
        'embedding': 768,
        'image_embedding': 1024
      }
    );

    // 3. hairstyles
    await convertTableEmbeddings('hairstyles',
      ['embedding'],
      {
        'embedding': 1536
      }
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ 모든 변환 완료!\n');
    console.log('다음 단계:');
    console.log('1. node scripts/verify-embedding-fix.js 실행');
    console.log('2. 챗봇 테스트');
    console.log('3. 문제 없으면 기존 컬럼 삭제 및 이름 변경\n');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

main();

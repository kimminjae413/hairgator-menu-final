-- ============================================================================
-- Supabase 임베딩 컬럼 타입 수정 스크립트 v5 (인덱스 없이)
-- TEXT를 VECTOR로 변환 (인덱스는 나중에)
-- ============================================================================
--
-- 실행 방법:
-- 1. Supabase 대시보드 접속 (https://bhsbwbeisqzgipvzpvym.supabase.co)
-- 2. SQL Editor 메뉴 클릭
-- 3. 이 파일 전체 복사 → 붙여넣기 → 실행
--
-- ============================================================================

-- 1. pgvector extension 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. recipe_samples 테이블
-- ============================================================================

-- image_embedding
ALTER TABLE recipe_samples
ALTER COLUMN image_embedding
TYPE vector(768)
USING image_embedding::text::vector;

-- recipe_embedding
ALTER TABLE recipe_samples
ALTER COLUMN recipe_embedding
TYPE vector(768)
USING recipe_embedding::text::vector;

-- summary_embedding
ALTER TABLE recipe_samples
ALTER COLUMN summary_embedding
TYPE vector(768)
USING summary_embedding::text::vector;

-- ============================================================================
-- 3. theory_chunks 테이블
-- ============================================================================

-- embedding
ALTER TABLE theory_chunks
ALTER COLUMN embedding
TYPE vector(768)
USING embedding::text::vector;

-- image_embedding
ALTER TABLE theory_chunks
ALTER COLUMN image_embedding
TYPE vector(1024)
USING image_embedding::text::vector;

-- ============================================================================
-- 4. hairstyles 테이블
-- ============================================================================

-- embedding
ALTER TABLE hairstyles
ALTER COLUMN embedding
TYPE vector(1536)
USING embedding::text::vector;

-- ============================================================================
-- 5. 변환 결과 확인
-- ============================================================================

SELECT
  'recipe_samples' as table_name,
  COUNT(*) as total_rows,
  COUNT(image_embedding) as image_emb,
  COUNT(recipe_embedding) as recipe_emb,
  COUNT(summary_embedding) as summary_emb
FROM recipe_samples;

SELECT
  'theory_chunks' as table_name,
  COUNT(*) as total_rows,
  COUNT(embedding) as embedding,
  COUNT(image_embedding) as image_emb
FROM theory_chunks;

SELECT
  'hairstyles' as table_name,
  COUNT(*) as total_rows,
  COUNT(embedding) as embedding
FROM hairstyles;

-- ============================================================================
-- 완료!
-- ============================================================================
--
-- ✅ 다음 단계:
-- 1. 위의 결과 확인
-- 2. node scripts/verify-embedding-fix.js 실행
-- 3. 챗봇 기능 테스트
-- 4. (선택) 인덱스는 나중에 별도로 생성 가능
--
-- 💡 인덱스가 없어도 벡터 검색은 작동합니다. 단지 속도가 느릴 뿐입니다.
--    데이터 개수가 많지 않으면 인덱스 없이도 충분히 빠릅니다.
--
-- ============================================================================

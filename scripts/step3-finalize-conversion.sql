-- ============================================================================
-- Step 3: 변환 완료 후 최종 정리
-- ============================================================================
--
-- ⚠️ 주의: Step 2 (Node.js 배치 변환)가 성공적으로 완료된 후에만 실행하세요!
--
-- 이 스크립트는:
-- 1. 기존 TEXT 컬럼 삭제
-- 2. 새 VECTOR 컬럼 이름 변경 (_vector 제거)
-- 3. 인덱스 생성 (선택사항)
--
-- ============================================================================

-- ============================================================================
-- 1. recipe_samples 테이블 정리
-- ============================================================================

BEGIN;

-- 기존 TEXT 컬럼 삭제
ALTER TABLE recipe_samples DROP COLUMN IF EXISTS image_embedding;
ALTER TABLE recipe_samples DROP COLUMN IF EXISTS recipe_embedding;
ALTER TABLE recipe_samples DROP COLUMN IF EXISTS summary_embedding;

-- 새 VECTOR 컬럼 이름 변경
ALTER TABLE recipe_samples RENAME COLUMN image_embedding_vector TO image_embedding;
ALTER TABLE recipe_samples RENAME COLUMN recipe_embedding_vector TO recipe_embedding;
ALTER TABLE recipe_samples RENAME COLUMN summary_embedding_vector TO summary_embedding;

COMMIT;

-- ============================================================================
-- 2. theory_chunks 테이블 정리
-- ============================================================================

BEGIN;

ALTER TABLE theory_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE theory_chunks DROP COLUMN IF EXISTS image_embedding;

ALTER TABLE theory_chunks RENAME COLUMN embedding_vector TO embedding;
ALTER TABLE theory_chunks RENAME COLUMN image_embedding_vector TO image_embedding;

COMMIT;

-- ============================================================================
-- 3. hairstyles 테이블 정리
-- ============================================================================

BEGIN;

ALTER TABLE hairstyles DROP COLUMN IF EXISTS embedding;

ALTER TABLE hairstyles RENAME COLUMN embedding_vector TO embedding;

COMMIT;

-- ============================================================================
-- 4. (선택사항) 인덱스 생성
-- ============================================================================

-- 데이터가 많지 않으면 인덱스 없이도 충분히 빠릅니다.
-- 필요하면 주석을 해제하고 실행하세요.

/*
CREATE INDEX CONCURRENTLY IF NOT EXISTS recipe_samples_image_embedding_idx
ON recipe_samples USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS recipe_samples_recipe_embedding_idx
ON recipe_samples USING ivfflat (recipe_embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS recipe_samples_summary_embedding_idx
ON recipe_samples USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS theory_chunks_embedding_idx
ON theory_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS theory_chunks_image_embedding_idx
ON theory_chunks USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS hairstyles_embedding_idx
ON hairstyles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);
*/

-- ============================================================================
-- 5. 최종 확인
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
-- 1. node scripts/verify-embedding-fix.js 실행
-- 2. 챗봇 기능 테스트
--
-- ============================================================================

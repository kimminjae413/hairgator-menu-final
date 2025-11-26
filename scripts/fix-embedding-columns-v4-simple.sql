-- ============================================================================
-- Supabase 임베딩 컬럼 타입 수정 스크립트 v4 (단순화 버전)
-- TEXT를 VECTOR로 직접 변환 (RENAME 없이)
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
-- 2. recipe_samples 테이블 - image_embedding
-- ============================================================================
BEGIN;

-- 기존 TEXT 컬럼을 VECTOR 타입으로 변경 (USING으로 캐스팅)
ALTER TABLE recipe_samples
ALTER COLUMN image_embedding
TYPE vector(768)
USING image_embedding::text::vector;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS recipe_samples_image_embedding_idx
ON recipe_samples USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 3. recipe_samples 테이블 - recipe_embedding
-- ============================================================================
BEGIN;

ALTER TABLE recipe_samples
ALTER COLUMN recipe_embedding
TYPE vector(768)
USING recipe_embedding::text::vector;

CREATE INDEX IF NOT EXISTS recipe_samples_recipe_embedding_idx
ON recipe_samples USING ivfflat (recipe_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 4. recipe_samples 테이블 - summary_embedding
-- ============================================================================
BEGIN;

ALTER TABLE recipe_samples
ALTER COLUMN summary_embedding
TYPE vector(768)
USING summary_embedding::text::vector;

CREATE INDEX IF NOT EXISTS recipe_samples_summary_embedding_idx
ON recipe_samples USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 5. theory_chunks 테이블 - embedding
-- ============================================================================
BEGIN;

ALTER TABLE theory_chunks
ALTER COLUMN embedding
TYPE vector(768)
USING embedding::text::vector;

CREATE INDEX IF NOT EXISTS theory_chunks_embedding_idx
ON theory_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 6. theory_chunks 테이블 - image_embedding
-- ============================================================================
BEGIN;

ALTER TABLE theory_chunks
ALTER COLUMN image_embedding
TYPE vector(1024)
USING image_embedding::text::vector;

CREATE INDEX IF NOT EXISTS theory_chunks_image_embedding_idx
ON theory_chunks USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 7. hairstyles 테이블 - embedding
-- ============================================================================
BEGIN;

ALTER TABLE hairstyles
ALTER COLUMN embedding
TYPE vector(1536)
USING embedding::text::vector;

CREATE INDEX IF NOT EXISTS hairstyles_embedding_idx
ON hairstyles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 8. 변환 결과 확인
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
--
-- ⚠️ 주의: 이 방법은 백업을 생성하지 않습니다!
--          문제 발생 시 Supabase 백업에서 복원해야 합니다.
--
-- ============================================================================

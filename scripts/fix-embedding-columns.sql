-- ============================================================================
-- Supabase 임베딩 컬럼 타입 수정 스크립트
-- TEXT 타입으로 잘못 저장된 임베딩을 VECTOR 타입으로 변환
-- ============================================================================
--
-- 실행 방법:
-- 1. Supabase 대시보드 접속 (https://bhsbwbeisqzgipvzpvym.supabase.co)
-- 2. SQL Editor 메뉴 클릭
-- 3. 이 파일 전체 복사 → 붙여넣기 → 실행
--
-- ⚠️ 주의사항:
-- - 이 스크립트는 기존 데이터를 백업 컬럼에 보관합니다
-- - 변환 후 문제가 없으면 마지막 섹션에서 백업 컬럼 삭제 가능
-- ============================================================================

-- 1. pgvector extension 활성화 확인
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. recipe_samples 테이블 수정
-- ============================================================================
BEGIN;

-- 2-1. image_embedding (768차원)
-- 기존 컬럼 백업
ALTER TABLE recipe_samples RENAME COLUMN image_embedding TO image_embedding_backup;

-- 새로운 VECTOR 컬럼 생성
ALTER TABLE recipe_samples ADD COLUMN image_embedding vector(768);

-- 데이터 변환 (TEXT → VECTOR)
UPDATE recipe_samples
SET image_embedding = image_embedding_backup::vector
WHERE image_embedding_backup IS NOT NULL
  AND image_embedding_backup != '';

-- 인덱스 생성 (벡터 검색 성능 향상)
CREATE INDEX IF NOT EXISTS recipe_samples_image_embedding_idx
ON recipe_samples USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- 2-2. recipe_embedding (768차원)
BEGIN;

ALTER TABLE recipe_samples RENAME COLUMN recipe_embedding TO recipe_embedding_backup;

ALTER TABLE recipe_samples ADD COLUMN recipe_embedding vector(768);

UPDATE recipe_samples
SET recipe_embedding = recipe_embedding_backup::vector
WHERE recipe_embedding_backup IS NOT NULL
  AND recipe_embedding_backup != '';

CREATE INDEX IF NOT EXISTS recipe_samples_recipe_embedding_idx
ON recipe_samples USING ivfflat (recipe_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- 2-3. summary_embedding (768차원)
BEGIN;

ALTER TABLE recipe_samples RENAME COLUMN summary_embedding TO summary_embedding_backup;

ALTER TABLE recipe_samples ADD COLUMN summary_embedding vector(768);

UPDATE recipe_samples
SET summary_embedding = summary_embedding_backup::vector
WHERE summary_embedding_backup IS NOT NULL
  AND summary_embedding_backup != '';

CREATE INDEX IF NOT EXISTS recipe_samples_summary_embedding_idx
ON recipe_samples USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 3. theory_chunks 테이블 수정
-- ============================================================================

-- 3-1. embedding (768차원)
BEGIN;

ALTER TABLE theory_chunks RENAME COLUMN embedding TO embedding_backup;

ALTER TABLE theory_chunks ADD COLUMN embedding vector(768);

UPDATE theory_chunks
SET embedding = embedding_backup::vector
WHERE embedding_backup IS NOT NULL
  AND embedding_backup != '';

CREATE INDEX IF NOT EXISTS theory_chunks_embedding_idx
ON theory_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- 3-2. image_embedding (1024차원)
BEGIN;

ALTER TABLE theory_chunks RENAME COLUMN image_embedding TO image_embedding_backup;

ALTER TABLE theory_chunks ADD COLUMN image_embedding vector(1024);

UPDATE theory_chunks
SET image_embedding = image_embedding_backup::vector
WHERE image_embedding_backup IS NOT NULL
  AND image_embedding_backup != '';

CREATE INDEX IF NOT EXISTS theory_chunks_image_embedding_idx
ON theory_chunks USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 4. hairstyles 테이블 수정
-- ============================================================================

-- embedding (1536차원)
BEGIN;

ALTER TABLE hairstyles RENAME COLUMN embedding TO embedding_backup;

ALTER TABLE hairstyles ADD COLUMN embedding vector(1536);

UPDATE hairstyles
SET embedding = embedding_backup::vector
WHERE embedding_backup IS NOT NULL
  AND embedding_backup != '';

CREATE INDEX IF NOT EXISTS hairstyles_embedding_idx
ON hairstyles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- ============================================================================
-- 5. 변환 결과 확인
-- ============================================================================

-- recipe_samples 확인
SELECT
  COUNT(*) as total_rows,
  COUNT(image_embedding) as image_emb_count,
  COUNT(recipe_embedding) as recipe_emb_count,
  COUNT(summary_embedding) as summary_emb_count
FROM recipe_samples;

-- theory_chunks 확인
SELECT
  COUNT(*) as total_rows,
  COUNT(embedding) as embedding_count,
  COUNT(image_embedding) as image_emb_count
FROM theory_chunks;

-- hairstyles 확인
SELECT
  COUNT(*) as total_rows,
  COUNT(embedding) as embedding_count
FROM hairstyles;

-- ============================================================================
-- 6. (선택사항) 백업 컬럼 삭제
-- ============================================================================
-- ⚠️ 변환이 정상적으로 완료되었는지 확인한 후에만 실행하세요!
-- ⚠️ 아래 주석을 제거하고 실행하면 백업 데이터가 영구 삭제됩니다!

/*
-- recipe_samples 백업 컬럼 삭제
ALTER TABLE recipe_samples DROP COLUMN IF EXISTS image_embedding_backup;
ALTER TABLE recipe_samples DROP COLUMN IF EXISTS recipe_embedding_backup;
ALTER TABLE recipe_samples DROP COLUMN IF EXISTS summary_embedding_backup;

-- theory_chunks 백업 컬럼 삭제
ALTER TABLE theory_chunks DROP COLUMN IF EXISTS embedding_backup;
ALTER TABLE theory_chunks DROP COLUMN IF EXISTS image_embedding_backup;

-- hairstyles 백업 컬럼 삭제
ALTER TABLE hairstyles DROP COLUMN IF EXISTS embedding_backup;
*/

-- ============================================================================
-- 완료!
-- ============================================================================
--
-- ✅ 다음 단계:
-- 1. 위의 "변환 결과 확인" 쿼리 결과를 확인하세요
-- 2. 각 테이블의 임베딩 카운트가 예상과 일치하는지 확인하세요
-- 3. 챗봇 검색 기능을 테스트하세요
-- 4. 모든 것이 정상이면 백업 컬럼을 삭제하세요 (선택사항)
--
-- ============================================================================

-- ============================================================================
-- Step 1: 새로운 VECTOR 타입 컬럼 생성
-- ============================================================================
--
-- 이 SQL을 먼저 실행하세요!
-- Supabase SQL Editor에서 실행
--
-- 소요 시간: 5초 이내 (타임아웃 없음)
-- ============================================================================

-- pgvector extension 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- recipe_samples 테이블
ALTER TABLE recipe_samples ADD COLUMN IF NOT EXISTS image_embedding_vector vector(768);
ALTER TABLE recipe_samples ADD COLUMN IF NOT EXISTS recipe_embedding_vector vector(768);
ALTER TABLE recipe_samples ADD COLUMN IF NOT EXISTS summary_embedding_vector vector(768);

-- theory_chunks 테이블
ALTER TABLE theory_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(768);
ALTER TABLE theory_chunks ADD COLUMN IF NOT EXISTS image_embedding_vector vector(1024);

-- hairstyles 테이블
ALTER TABLE hairstyles ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- 확인
SELECT 'recipe_samples' as table_name,
       COUNT(*) as total_rows,
       COUNT(image_embedding_vector) as new_col_count
FROM recipe_samples;

SELECT 'theory_chunks' as table_name,
       COUNT(*) as total_rows,
       COUNT(embedding_vector) as new_col_count
FROM theory_chunks;

SELECT 'hairstyles' as table_name,
       COUNT(*) as total_rows,
       COUNT(embedding_vector) as new_col_count
FROM hairstyles;

-- ============================================================================
-- 완료!
-- ============================================================================
--
-- ✅ 다음 단계: node scripts/convert-embeddings-batch.js 실행
--
-- ============================================================================

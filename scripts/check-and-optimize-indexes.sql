-- ========================================
-- Supabase 벡터 인덱스 확인 및 최적화
-- ========================================
--
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor 열기
-- 2. 이 파일 내용을 복사해서 붙여넣기
-- 3. Run 클릭
--
-- ========================================

-- 1. 현재 인덱스 확인
-- ========================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('recipe_samples', 'theory_chunks')
ORDER BY tablename, indexname;

-- 2. 벡터 확장 확인
-- ========================================
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 3. recipe_samples 테이블의 인덱스 상세 정보
-- ========================================
SELECT
    i.relname AS index_name,
    a.attname AS column_name,
    am.amname AS index_type,
    idx.indisunique AS is_unique,
    idx.indisprimary AS is_primary
FROM
    pg_index idx
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_class t ON t.oid = idx.indrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
    JOIN pg_am am ON am.oid = i.relam
WHERE
    t.relname = 'recipe_samples'
ORDER BY i.relname;

-- 4. theory_chunks 테이블의 인덱스 상세 정보
-- ========================================
SELECT
    i.relname AS index_name,
    a.attname AS column_name,
    am.amname AS index_type,
    idx.indisunique AS is_unique,
    idx.indisprimary AS is_primary
FROM
    pg_index idx
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_class t ON t.oid = idx.indrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
    JOIN pg_am am ON am.oid = i.relam
WHERE
    t.relname = 'theory_chunks'
ORDER BY i.relname;

-- ========================================
-- 벡터 인덱스 최적화 (필요 시 실행)
-- ========================================

-- 5. recipe_samples의 recipe_embedding 인덱스 생성/재생성
-- ========================================
-- 기존 인덱스가 있으면 삭제
DROP INDEX IF EXISTS recipe_samples_recipe_embedding_idx;

-- HNSW 인덱스 생성 (빠른 검색)
CREATE INDEX recipe_samples_recipe_embedding_idx
ON recipe_samples
USING hnsw (recipe_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. recipe_samples의 image_embedding 인덱스 생성/재생성
-- ========================================
DROP INDEX IF EXISTS recipe_samples_image_embedding_idx;

CREATE INDEX recipe_samples_image_embedding_idx
ON recipe_samples
USING hnsw (image_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 7. theory_chunks의 embedding 인덱스 생성/재생성
-- ========================================
DROP INDEX IF EXISTS theory_chunks_embedding_idx;

CREATE INDEX theory_chunks_embedding_idx
ON theory_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ========================================
-- 추가 성능 최적화 인덱스
-- ========================================

-- 8. 성별 필터링을 위한 인덱스
-- ========================================
CREATE INDEX IF NOT EXISTS recipe_samples_gender_idx
ON recipe_samples(gender);

-- 9. 스타일 카테고리 필터링을 위한 인덱스
-- ========================================
CREATE INDEX IF NOT EXISTS recipe_samples_style_category_idx
ON recipe_samples(style_category);

-- 10. theory_chunks 카테고리 인덱스
-- ========================================
CREATE INDEX IF NOT EXISTS theory_chunks_category_idx
ON theory_chunks(category_code);

-- 11. keywords GIN 인덱스 (배열 검색 최적화)
-- ========================================
CREATE INDEX IF NOT EXISTS recipe_samples_keywords_idx
ON recipe_samples USING gin(keywords);

CREATE INDEX IF NOT EXISTS theory_chunks_keywords_idx
ON theory_chunks USING gin(keywords);

-- ========================================
-- 통계 업데이트 (선택 사항)
-- ========================================
ANALYZE recipe_samples;
ANALYZE theory_chunks;

-- ========================================
-- 최종 확인: 모든 인덱스 다시 조회
-- ========================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('recipe_samples', 'theory_chunks')
ORDER BY tablename, indexname;

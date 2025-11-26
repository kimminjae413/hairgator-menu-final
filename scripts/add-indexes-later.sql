-- ============================================================================
-- 인덱스 추가 스크립트 (선택사항)
-- 벡터 검색 성능 향상을 위한 인덱스 생성
-- ============================================================================
--
-- ⚠️ 주의:
-- - 이 스크립트는 타입 변환 후에만 실행하세요
-- - 메모리 부족 오류가 발생할 수 있습니다
-- - 인덱스가 없어도 검색은 작동합니다 (단지 느릴 뿐)
--
-- 실행 여부: 선택사항
-- - 데이터 < 10,000개: 인덱스 불필요 (브루트 포스도 충분히 빠름)
-- - 데이터 > 10,000개: 인덱스 권장
--
-- ============================================================================

-- 1. recipe_samples 인덱스 (작은 lists 값 사용)
CREATE INDEX CONCURRENTLY IF NOT EXISTS recipe_samples_image_embedding_idx
ON recipe_samples USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 50);  -- 100 → 50으로 줄임

CREATE INDEX CONCURRENTLY IF NOT EXISTS recipe_samples_recipe_embedding_idx
ON recipe_samples USING ivfflat (recipe_embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS recipe_samples_summary_embedding_idx
ON recipe_samples USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 50);

-- 2. theory_chunks 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS theory_chunks_embedding_idx
ON theory_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX CONCURRENTLY IF NOT EXISTS theory_chunks_image_embedding_idx
ON theory_chunks USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 50);

-- 3. hairstyles 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS hairstyles_embedding_idx
ON hairstyles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);  -- 데이터 적으니 더 작게

-- ============================================================================
-- 완료!
-- ============================================================================
--
-- CONCURRENTLY 옵션:
-- - 테이블 잠금 없이 인덱스 생성
-- - 시간이 더 오래 걸리지만 서비스 중단 없음
--
-- ============================================================================

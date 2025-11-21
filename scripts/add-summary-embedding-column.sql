-- recipe_samples 테이블에 summary_embedding 컬럼 추가
ALTER TABLE recipe_samples
ADD COLUMN IF NOT EXISTS summary_embedding vector(768);

-- 인덱스 생성 (HNSW 알고리즘, 코사인 유사도)
CREATE INDEX IF NOT EXISTS recipe_samples_summary_embedding_idx
ON recipe_samples
USING hnsw (summary_embedding vector_cosine_ops);

-- 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recipe_samples'
AND column_name = 'summary_embedding';

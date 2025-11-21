-- recipe_samples 테이블의 임베딩 관련 컬럼 타입 확인
SELECT
  column_name,
  data_type,
  udt_name,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'recipe_samples'
  AND column_name IN ('recipe_embedding', 'summary_embedding')
ORDER BY ordinal_position;

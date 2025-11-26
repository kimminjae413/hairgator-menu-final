-- recipe_samples 테이블 스키마 확인
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'recipe_samples'
  AND column_name IN ('id', 'sample_code', 'gender', 'keywords', 'recipe_summary_ko')
ORDER BY ordinal_position;

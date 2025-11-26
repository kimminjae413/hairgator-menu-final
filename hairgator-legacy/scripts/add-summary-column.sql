-- recipe_samples 테이블에 recipe_summary_ko 컬럼 추가
ALTER TABLE recipe_samples
ADD COLUMN IF NOT EXISTS recipe_summary_ko TEXT;

-- 컬럼 추가 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recipe_samples'
AND column_name = 'recipe_summary_ko';

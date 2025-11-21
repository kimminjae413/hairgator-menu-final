-- match_recipe_samples 함수 재생성 (recipe_embedding 사용)
-- 이 SQL을 Supabase 대시보드 SQL Editor에서 실행하세요

DROP FUNCTION IF EXISTS match_recipe_samples(vector(768), float, int, text);

CREATE OR REPLACE FUNCTION match_recipe_samples(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_gender text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  sample_code varchar(50),
  gender varchar(10),
  keywords text[],
  recipe_summary_ko text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    recipe_samples.id,
    recipe_samples.sample_code,
    recipe_samples.gender,
    recipe_samples.keywords,
    recipe_samples.recipe_summary_ko,
    (1 - (recipe_samples.recipe_embedding <=> query_embedding)) as similarity
  FROM recipe_samples
  WHERE
    recipe_samples.recipe_embedding IS NOT NULL
    AND (filter_gender IS NULL OR recipe_samples.gender = filter_gender)
    AND (1 - (recipe_samples.recipe_embedding <=> query_embedding)) > match_threshold
  ORDER BY recipe_samples.recipe_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 함수 실행 후 간단한 테스트
SELECT
  'match_recipe_samples 함수 생성 완료!' as status,
  COUNT(*) as total_recipes_with_embedding
FROM recipe_samples
WHERE recipe_embedding IS NOT NULL;

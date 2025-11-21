-- match_recipe_samples 함수 정의 확인
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'match_recipe_samples';

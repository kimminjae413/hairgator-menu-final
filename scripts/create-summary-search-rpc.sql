-- summary_embedding을 사용하는 검색 RPC 함수 생성

CREATE OR REPLACE FUNCTION match_recipe_summaries(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_gender text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    sample_code character varying,
    gender character varying,
    style_category character varying,
    keywords text[],
    params_56 jsonb,
    recipe_summary_ko text,
    recipe_full_text_ko text,
    main_image_url text,
    similarity float
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        rs.id,
        rs.sample_code,
        rs.gender,
        rs.style_category,
        rs.keywords,
        rs.params_56,
        rs.recipe_summary_ko,
        rs.recipe_full_text_ko,
        rs.main_image_url,
        1 - (rs.summary_embedding <=> query_embedding) AS similarity
    FROM recipe_samples rs
    WHERE
        (filter_gender IS NULL OR rs.gender = filter_gender)
        AND rs.summary_embedding IS NOT NULL
        AND (1 - (rs.summary_embedding <=> query_embedding)) > match_threshold
    ORDER BY rs.summary_embedding <=> query_embedding
    LIMIT match_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION match_recipe_summaries(vector(768), float, int, text) TO anon, authenticated;

SELECT 'RPC function created successfully' AS status;

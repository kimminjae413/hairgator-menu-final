DROP FUNCTION IF EXISTS match_recipe_samples(vector(768), float, int, text);
DROP FUNCTION IF EXISTS match_recipe_samples(vector(768), float, int, character varying);
DROP FUNCTION IF EXISTS match_recipe_samples(vector(768), double precision, integer, text);
DROP FUNCTION IF EXISTS match_recipe_samples(vector(768), double precision, integer, character varying);

CREATE OR REPLACE FUNCTION match_recipe_samples(
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
    recipe_full_text_ko text,
    main_image_url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rs.id,
        rs.sample_code,
        rs.gender,
        rs.style_category,
        rs.keywords,
        rs.params_56,
        rs.recipe_full_text_ko,
        rs.main_image_url,
        1 - (rs.recipe_embedding <=> query_embedding) AS similarity
    FROM recipe_samples rs
    WHERE
        (filter_gender IS NULL OR rs.gender = filter_gender)
        AND (1 - (rs.recipe_embedding <=> query_embedding)) > match_threshold
        AND (rs.recipe_full_text_ko IS NULL OR rs.recipe_full_text_ko NOT LIKE '%죄송합니다%')
        AND (rs.keywords IS NOT NULL AND array_length(rs.keywords, 1) > 2)
    ORDER BY rs.recipe_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_recipe_samples(vector(768), float, int, text) TO anon, authenticated;

SELECT 'RPC function updated successfully with error filtering' AS status;

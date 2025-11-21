DROP FUNCTION IF EXISTS match_recipe_samples(vector(768), float, int, text);

CREATE OR REPLACE FUNCTION match_recipe_samples(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_gender text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    sample_code text,
    gender text,
    style_category text,
    keywords text[],
    params_56 jsonb,
    recipe_full_text_ko text,
    image_url text,
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
        rs.image_url,
        1 - (rs.recipe_embedding <=> query_embedding) AS similarity
    FROM recipe_samples rs
    WHERE
        (filter_gender IS NULL OR rs.gender = filter_gender)
        AND (1 - (rs.recipe_embedding <=> query_embedding)) > match_threshold
    ORDER BY rs.recipe_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS match_theory_chunks(vector(768), float, int);

CREATE OR REPLACE FUNCTION match_theory_chunks(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id bigint,
    section_title text,
    category_code text,
    keywords text[],
    content text,
    image_url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc.section_title,
        tc.category_code,
        tc.keywords,
        tc.content,
        tc.image_url,
        1 - (tc.embedding <=> query_embedding) AS similarity
    FROM theory_chunks tc
    WHERE (1 - (tc.embedding <=> query_embedding)) > match_threshold
    ORDER BY tc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_recipe_samples(vector(768), float, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_theory_chunks(vector(768), float, int) TO anon, authenticated;

SELECT 'RPC functions updated successfully' AS status;

SELECT
    COUNT(*) AS total_recipes,
    COUNT(*) FILTER (WHERE keywords IS NOT NULL AND array_length(keywords, 1) > 0) AS recipes_with_keywords
FROM recipe_samples;

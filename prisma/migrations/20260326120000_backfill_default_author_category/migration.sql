-- Preenche autor e categoria padrão (modelo diabetes) onde estiver vazio ou placeholder
UPDATE "Article"
SET "author" = 'Prof. Paulo Barbosa'
WHERE "author" IS NULL OR TRIM("author") = '';

UPDATE "Article"
SET "categoryTag" = 'Sistema Imune e Geral'
WHERE "categoryTag" IS NULL
   OR TRIM("categoryTag") = ''
   OR LOWER(TRIM("categoryTag")) = 'artigo';

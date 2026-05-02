param(
  [string]$Root = "backend"
)

$patterns = @(
  'pgxpool\.Pool',
  '\$[0-9]+',
  'RETURNING',
  '::jsonb',
  '::text',
  '::uuid',
  'date_trunc',
  'INTERVAL',
  'gen_random_uuid',
  'ANY\(',
  '@>',
  '\|\|',
  'make_date',
  'EXTRACT\(',
  'TO_CHAR',
  'LATERAL'
)

Get-ChildItem -Path $Root -Recurse -File -Include *.go,*.sql |
  Where-Object { $_.FullName -notmatch 'migrations_mysql' } |
  Select-String -Pattern $patterns |
  Group-Object Path |
  Sort-Object Count -Descending |
  Select-Object Count, Name

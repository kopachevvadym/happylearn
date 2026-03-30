alter table public.api_keys
add column if not exists prefix text not null default '';

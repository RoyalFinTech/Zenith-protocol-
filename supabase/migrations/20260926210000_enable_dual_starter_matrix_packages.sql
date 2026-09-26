-- Enable both matrix programs through Starter packages only.
-- 2x4 Starter: 10 USDT. 2x6 Starter: 30 USDT.
-- Keep the established 20/70/10 allocation model; 2x4 level distribution is intentionally
-- left unset until the approved level-by-level percentages are supplied.
update public.program_packages
set price=10, asset='USDT', active=true,
    description='2x4 Starter matrix package with $10 USDT entry.'
where code='2x4-starter';

update public.program_packages
set price=30, asset='USDT', active=true,
    description='2x6 Starter matrix package with $30 USDT entry.'
where code='2x6-starter';

update public.program_packages
set price=null
where code in ('2x4-growth','2x4-elite','2x6-growth','2x6-elite');

insert into public.package_economics
  (package_id,entry_amount,asset,direct_percent,matrix_percent,admin_percent,matrix_levels,matrix_capacity)
select pp.id,10,'USDT',20,70,10,4,30
from public.program_packages pp
where pp.code='2x4-starter'
on conflict (package_id) do update set
  entry_amount=excluded.entry_amount,
  asset=excluded.asset,
  direct_percent=excluded.direct_percent,
  matrix_percent=excluded.matrix_percent,
  admin_percent=excluded.admin_percent,
  matrix_levels=excluded.matrix_levels,
  matrix_capacity=excluded.matrix_capacity;

update public.package_economics
set entry_amount=30, asset='USDT',
    direct_percent=20, matrix_percent=70, admin_percent=10,
    matrix_levels=6, matrix_capacity=126
where package_id=(select id from public.program_packages where code='2x6-starter');
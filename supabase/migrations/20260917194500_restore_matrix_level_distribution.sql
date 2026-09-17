-- Preserve the intended binary matrix distribution for the existing 2x4 and 2x6 capacities.
-- Level 1 is the root; each following level contains up to 2^(level-1) nodes.
-- The programs use positions 1..30 and 1..126 respectively.
update public.matrix_nodes n
set level = case
  when n.position = 1 then 1
  when n.position between 2 and 3 then 2
  when n.position between 4 and 7 then 3
  when n.position between 8 and 15 then 4
  when p.code = '2x4' and n.position between 16 and 30 then 5
  when p.code = '2x6' and n.position between 16 and 31 then 5
  when p.code = '2x6' and n.position between 32 and 63 then 6
  when p.code = '2x6' and n.position between 64 and 126 then 7
  else n.level
end
from public.programs p
where p.id=n.program_id
  and p.code in ('2x4','2x6');

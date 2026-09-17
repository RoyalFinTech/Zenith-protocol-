-- Align existing empty matrix nodes with the binary structure shown in the client plan.
-- Positions are descendants only: 2,4,8,16... per level; the UI's YOU/root is not a stored node.
update public.matrix_nodes n
set level = case
  when p.code = '2x4' and n.position between 1 and 2 then 1
  when p.code = '2x4' and n.position between 3 and 6 then 2
  when p.code = '2x4' and n.position between 7 and 14 then 3
  when p.code = '2x4' and n.position between 15 and 30 then 4
  when p.code = '2x6' and n.position between 1 and 2 then 1
  when p.code = '2x6' and n.position between 3 and 6 then 2
  when p.code = '2x6' and n.position between 7 and 14 then 3
  when p.code = '2x6' and n.position between 15 and 30 then 4
  when p.code = '2x6' and n.position between 31 and 62 then 5
  when p.code = '2x6' and n.position between 63 and 126 then 6
  else n.level
end
from public.programs p
where p.id=n.program_id and p.code in ('2x4','2x6');

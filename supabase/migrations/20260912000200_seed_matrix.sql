-- Seed the structural positions for the two UI programs.
insert into public.matrix_nodes(program_id,level,position,status)
select p.id, floor((g-1)/8)+1, g, 'available' from public.programs p cross join generate_series(1,30) g where p.code='2x4'
on conflict (program_id,position) do nothing;
insert into public.matrix_nodes(program_id,level,position,status)
select p.id, floor((g-1)/21)+1, g, 'available' from public.programs p cross join generate_series(1,126) g where p.code='2x6'
on conflict (program_id,position) do nothing;

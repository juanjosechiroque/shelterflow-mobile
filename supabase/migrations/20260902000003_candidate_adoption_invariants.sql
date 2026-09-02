-- Enforce the bidirectional consistency between candidates and adoptions.

-- Prevalidate existing data before installing the triggers. If any historical
-- row already violates the invariant we refuse to install the constraints;
-- historical data is never modified automatically.
do $prevalidate$
declare
  v_selected_without_adoption integer;
  v_adoption_with_non_selected integer;
begin
  select count(*)
    into v_selected_without_adoption
    from public.candidates c
   where c.status = 'SELECTED'
     and not exists (
       select 1
       from public.adoptions a
       where a.candidate_id = c.id
     );

  if v_selected_without_adoption > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'Found %s SELECTED candidate(s) without an adoption',
        v_selected_without_adoption
      );
  end if;

  select count(*)
    into v_adoption_with_non_selected
    from public.adoptions a
   where not exists (
     select 1
     from public.candidates c
      where c.id = a.candidate_id
        and c.status = 'SELECTED'
   );

  if v_adoption_with_non_selected > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'Found %s adoption(s) referencing a non-SELECTED candidate',
        v_adoption_with_non_selected
      );
  end if;
end;
$prevalidate$;

create unique index adoptions_one_per_candidate_idx
  on public.adoptions (candidate_id);

create or replace function public.assert_candidate_adoption_consistency(
  p_candidate_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_candidate_status text;
  v_has_adoption boolean;
begin
  if p_candidate_id is null then
    return;
  end if;

  select c.status
  into v_candidate_status
  from public.candidates c
  where c.id = p_candidate_id;

  if not found then
    return;
  end if;

  select exists (
    select 1
    from public.adoptions a
    where a.candidate_id = p_candidate_id
  )
  into v_has_adoption;

  if v_candidate_status = 'SELECTED' and not v_has_adoption then
    raise exception using
      errcode = '23514',
      message = 'Selected candidate must have an adoption';
  end if;

  if v_candidate_status <> 'SELECTED' and v_has_adoption then
    raise exception using
      errcode = '23514',
      message = 'Adoption candidate must be SELECTED';
  end if;
end;
$$;

create or replace function public.enforce_candidate_adoption_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'candidates' then
    perform public.assert_candidate_adoption_consistency(new.id);
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.assert_candidate_adoption_consistency(old.candidate_id);
    return null;
  end if;

  if tg_op = 'UPDATE' and old.candidate_id is distinct from new.candidate_id then
    perform public.assert_candidate_adoption_consistency(old.candidate_id);
  end if;

  perform public.assert_candidate_adoption_consistency(new.candidate_id);
  return null;
end;
$$;

create constraint trigger candidates_validate_adoption_on_insert
after insert on public.candidates
deferrable initially deferred
for each row
execute function public.enforce_candidate_adoption_consistency();

create constraint trigger candidates_validate_adoption_on_status_update
after update of status on public.candidates
deferrable initially deferred
for each row
execute function public.enforce_candidate_adoption_consistency();

create constraint trigger adoptions_validate_candidate_on_insert
after insert on public.adoptions
deferrable initially deferred
for each row
execute function public.enforce_candidate_adoption_consistency();

create constraint trigger adoptions_validate_candidate_on_reference_update
after update of candidate_id, shelter_id on public.adoptions
deferrable initially deferred
for each row
execute function public.enforce_candidate_adoption_consistency();

create constraint trigger adoptions_validate_candidate_on_delete
after delete on public.adoptions
deferrable initially deferred
for each row
execute function public.enforce_candidate_adoption_consistency();

-- Security and quota tests. Run with `pnpm test:db` (see scripts/test-db.sh).
-- Each check raises "FAIL: ..." or an assertion error if a rule is broken.
\set ON_ERROR_STOP 1
-- Two users; profiles come from the trigger.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
do $$ begin assert (select count(*) from public.profiles) = 2, 'trigger should create profiles'; end $$;

-- As user A: create a character, can't see B's, can't change own tier.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.characters (profile_id, name, faction, race, class, level, zone_id)
  values ('11111111-1111-1111-1111-111111111111', 'Aldric', 'alliance', 'human', 'warrior', 5, 'elwynn-forest');
do $$ begin
  begin
    insert into public.characters (profile_id, name, faction, race, class, level)
      values ('22222222-2222-2222-2222-222222222222', 'Sneaky', 'horde', 'orc', 'rogue', 5);
    raise exception 'FAIL: inserted a character for another user';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.profiles set display_name = 'A' where id = auth.uid();
do $$ begin
  begin
    update public.profiles set tier = 'supporter' where id = auth.uid();
    raise exception 'FAIL: user upgraded own tier';
  exception when insufficient_privilege then null;
  end;
end $$;
-- Users can't call reserve_plan_request or insert plans/requests directly.
do $$ begin
  begin
    perform public.reserve_plan_request(auth.uid(), 1000);
    raise exception 'FAIL: user called reserve_plan_request';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.plan_requests (profile_id) values (auth.uid());
    raise exception 'FAIL: user inserted a plan request';
  exception when insufficient_privilege then null;
  end;
end $$;
do $$ begin assert (select count(*) from public.game_zones) > 0, 'game data should be readable'; end $$;
reset role;

-- As the server: quota and rate limit.
set role service_role;
do $$
declare r uuid; c uuid; i int;
begin
  -- Three plans spaced out (backdate the earlier ones past the rate limit).
  for i in 1..3 loop
    r := public.reserve_plan_request('11111111-1111-1111-1111-111111111111', 3);
    update public.plan_requests set status = 'succeeded', created_at = now() - interval '1 hour' * i where id = r;
  end loop;
  begin
    perform public.reserve_plan_request('11111111-1111-1111-1111-111111111111', 3);
    raise exception 'FAIL: 4th free plan allowed';
  exception when raise_exception then
    if sqlerrm <> 'quota_exceeded' then raise; end if;
  end;

  -- Deleting the character must not reset the quota.
  select id into c from public.characters where name = 'Aldric';
  insert into public.session_plans (request_id, profile_id, character_id, share_id, minutes, goal, plan)
    select id, profile_id, c, 'share' || md5(id::text), 60, 'xp', '{}'::jsonb
    from public.plan_requests where profile_id = '11111111-1111-1111-1111-111111111111';
  delete from public.characters where id = c;
  assert (select count(*) from public.session_plans) = 0, 'plans cascade with the character';
  begin
    perform public.reserve_plan_request('11111111-1111-1111-1111-111111111111', 3);
    raise exception 'FAIL: deleting a character reset the quota';
  exception when raise_exception then
    if sqlerrm <> 'quota_exceeded' then raise; end if;
  end;

  -- Failed requests don't count; the rate limit applies regardless.
  r := public.reserve_plan_request('22222222-2222-2222-2222-222222222222', 3);
  update public.plan_requests set status = 'failed' where id = r;
  begin
    perform public.reserve_plan_request('22222222-2222-2222-2222-222222222222', 3);
    raise exception 'FAIL: rate limit not enforced';
  exception when raise_exception then
    if sqlerrm <> 'rate_limited' then raise; end if;
  end;

  -- Supporters have no weekly cap.
  update public.profiles set tier = 'supporter' where id = '11111111-1111-1111-1111-111111111111';
  perform public.reserve_plan_request('11111111-1111-1111-1111-111111111111', 3);
end $$;

-- A shared plan for user B, readable anonymously only through get_shared_plan.
do $$
declare r uuid; c uuid;
begin
  update public.plan_requests set created_at = now() - interval '1 minute'
    where profile_id = '22222222-2222-2222-2222-222222222222';
  r := public.reserve_plan_request('22222222-2222-2222-2222-222222222222', 3);
  insert into public.characters (profile_id, name, faction, race, class, level)
    values ('22222222-2222-2222-2222-222222222222', 'Grokk', 'horde', 'orc', 'hunter', 8) returning id into c;
  insert into public.session_plans (request_id, profile_id, character_id, share_id, minutes, goal, plan)
    values (r, '22222222-2222-2222-2222-222222222222', c, 'abcdefghijklmnop1234', 90, 'xp', '{"summary":"hi"}');
end $$;
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.session_plans) = 0, 'anon must not read session_plans';
  assert (select count(*) from public.characters) = 0, 'anon must not read characters';
  assert (select count(*) from public.waitlist) = 0, 'anon must not read waitlist';
  assert (select character_name from public.get_shared_plan('abcdefghijklmnop1234')) = 'Grokk', 'shared plan readable';
  assert (select count(*) from public.get_shared_plan('nope')) = 0, 'unknown share id returns nothing';
  assert (select count(*) from public.zone_neighbors where zone_id = 'elwynn-forest') = 4, 'elwynn has 4 neighbors';
end $$;
reset role;

-- User A can't read B's plan via the table.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin assert (select count(*) from public.session_plans) = 0, 'A must not see B''s plans'; end $$;
reset role;
\echo ALL DATABASE TESTS PASSED

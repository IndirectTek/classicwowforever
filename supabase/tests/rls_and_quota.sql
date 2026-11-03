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
-- Quest reports: users add, read and withdraw only their own new reports.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare i int;
begin
  insert into public.quest_reports (profile_id, kind, game, name, zone_id, min_level, max_level, faction, seen_on)
    values (auth.uid(), 'new', 'classic-era', 'A Report', 'elwynn-forest', 2, 5, 'alliance', current_date);
  begin
    insert into public.quest_reports (profile_id, status, kind, game, name, zone_id, min_level, max_level, faction, seen_on)
      values (auth.uid(), 'applied', 'new', 'forever', 'Self Approved', 'elwynn-forest', 2, 5, 'alliance', current_date);
    raise exception 'FAIL: user approved own report';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.quest_reports (profile_id, kind, game, name, zone_id, min_level, max_level, faction, seen_on)
      values ('22222222-2222-2222-2222-222222222222', 'new', 'forever', 'Not Mine', 'elwynn-forest', 2, 5, 'alliance', current_date);
    raise exception 'FAIL: reported as another user';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.quest_reports set status = 'applied';
    raise exception 'FAIL: user changed a report status';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.quest_reports (profile_id, kind, game, name, zone_id, min_level, max_level, faction, seen_on)
      values (auth.uid(), 'new', 'forever', 'From The Future', 'elwynn-forest', 2, 5, 'alliance', current_date + 7);
    raise exception 'FAIL: report dated in the future';
  exception when raise_exception then
    if sqlerrm <> 'seen_on_in_future' then raise; end if;
  end;
  -- 40 a day, then refused.
  for i in 2..40 loop
    insert into public.quest_reports (profile_id, kind, game, name, zone_id, min_level, max_level, faction, seen_on)
      values (auth.uid(), 'new', 'classic-era', 'Report ' || i, 'elwynn-forest', 2, 5, 'alliance', current_date);
  end loop;
  begin
    insert into public.quest_reports (profile_id, kind, game, name, zone_id, min_level, max_level, faction, seen_on)
      values (auth.uid(), 'new', 'classic-era', 'One Too Many', 'elwynn-forest', 2, 5, 'alliance', current_date);
    raise exception 'FAIL: report limit not enforced';
  exception when raise_exception then
    if sqlerrm <> 'report_limit' then raise; end if;
  end;
  delete from public.quest_reports where name = 'Report 40';
  assert (select count(*) from public.quest_reports) = 39, 'user withdraws own new report';
end $$;
reset role;

set role service_role;
update public.quest_reports set status = 'applied' where name = 'A Report';
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  delete from public.quest_reports where name = 'A Report';
  assert (select count(*) from public.quest_reports where name = 'A Report') = 1, 'reviewed reports stay';
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert (select count(*) from public.quest_reports) = 0, 'B must not see A''s reports'; end $$;
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin assert (select count(*) from public.quest_reports) = 0, 'anon must not read reports'; end $$;
reset role;
\echo ALL DATABASE TESTS PASSED

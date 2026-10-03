-- Optional development data. Run with psql -v user_id='<existing auth.users UUID>' -f supabase/seed.dev.sql.
-- Do not run against production.
with new_areas as (
  insert into public.tracker_areas(user_id,name,color,position)
  values (:'user_id'::uuid,'Health','#16a34a',0),(:'user_id'::uuid,'Fitness','#2563eb',1),(:'user_id'::uuid,'Learning','#d97706',2)
  returning id,name
)
insert into public.tracker_habits(user_id,area_id,name,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,position)
select :'user_id'::uuid,id,'Drink Water','GOOD','MEASURABLE',3,'L','DAILY','{}',current_date,0 from new_areas where name='Health'
union all select :'user_id'::uuid,id,'Read','GOOD','MEASURABLE',30,'pages','DAILY','{}',current_date,1 from new_areas where name='Learning'
union all select :'user_id'::uuid,id,'Workout','GOOD','BOOLEAN',null,null,'WEEKDAYS','{"weekdays":[1,3,5]}',current_date,2 from new_areas where name='Fitness'
union all select :'user_id'::uuid,id,'Walk','GOOD','MEASURABLE',10000,'steps','DAILY','{}',current_date,3 from new_areas where name='Fitness';

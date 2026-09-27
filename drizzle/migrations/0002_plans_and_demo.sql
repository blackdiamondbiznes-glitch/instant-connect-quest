ALTER TABLE public.tg_owners
  ADD COLUMN plan_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN subscription_ends_at timestamptz,
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

INSERT INTO public.tg_owners (telegram_id, first_name, username, language, step, niche, workspace_type, modules, is_demo, plan_status)
VALUES
 (-1,'Dilnoza','demo_seller','uz','done','seller','public_channel','{catalog,orders,stock,debts,broadcast,reviews,ai_pulse,ai_faq}',true,'active'),
 (-2,'Jasur','demo_tutor','uz','done','tutor','private_group','{payments,debts,activity,access,schedule,reminders,ai_pulse,ai_faq}',true,'active'),
 (-3,'Sardor','demo_vip','uz','done','vip','private_channel','{access,payments,reminders,signals,broadcast,ai_pulse,ai_faq}',true,'active'),
 (-4,'Malika','demo_beauty','uz','done','beauty','public_channel','{bookings,deposits,reminders,reviews,broadcast,ai_pulse,ai_faq}',true,'active'),
 (-5,'Bobur','demo_fitness','uz','done','fitness','private_group','{payments,debts,programs,activity,reminders,ai_pulse,ai_faq}',true,'active'),
 (-6,'Dr. Aziz','demo_doctor','uz','done','doctor','private_channel','{bookings,deposits,confidential,reminders,access,ai_pulse,ai_faq}',true,'active'),
 (-7,'Nigora','demo_psy','uz','done','psychologist','private_channel','{bookings,deposits,confidential,access,reminders,ai_pulse,ai_faq}',true,'active'),
 (-8,'Rustam','demo_realty','uz','done','realestate','public_channel','{listings,leads,broadcast,reminders,ai_pulse,ai_faq}',true,'active'),
 (-9,'Anvar','demo_logistics','uz','done','logistics','private_group','{waybill,dispatch,stock,debts,payments}',true,'active'),
 (-10,'Kamola','demo_edu','uz','done','educenter','private_group','{payments,debts,activity,schedule,broadcast,reminders,ai_pulse,ai_faq}',true,'active');

INSERT INTO public.tg_chats (chat_id, owner_id, title, chat_type)
SELECT -1000000000 + o.telegram_id, o.telegram_id, 'Demo ' || o.niche, 'supergroup' FROM public.tg_owners o WHERE o.is_demo;

-- members: 3 statuses per niche
WITH st(niche, s1, s2, s3) AS (VALUES
 ('seller','regular','debtor','inactive'),('tutor','paid','debtor','inactive'),('vip','active','expiring','expired'),
 ('beauty','regular','new','lost'),('fitness','paid','debtor','inactive'),('doctor','prepaid','debtor','inactive'),
 ('psychologist','active','debtor','paused'),('realestate','hot','warm','cold'),('logistics','paid','debtor','inactive'),
 ('educenter','paid','debtor','inactive')),
names(n, nm, ph, amt, pick) AS (VALUES
 (1,'Aziza Karimova','+998901112233',350000,1),(2,'Sherzod Aliyev','+998935554433',200000,2),(3,'Madina Yusupova','+998977778899',0,3),
 (4,'Otabek Rahimov','+998909990011',450000,1),(5,'Gulnora Tosheva','+998911234567',150000,2),(6,'Javohir Ergashev','+998946667788',300000,1))
INSERT INTO public.members (owner_id, name, phone, status, amount)
SELECT o.telegram_id, nm, ph, CASE pick WHEN 1 THEN s1 WHEN 2 THEN s2 ELSE s3 END, amt
FROM public.tg_owners o JOIN st ON st.niche = o.niche CROSS JOIN names WHERE o.is_demo;

WITH r(niche, t1, t2, t3, s1, s2, s3) AS (VALUES
 ('seller','Qishki kurtka ×2','Krossovka Nike','Sumka charm','new','shipped','delivered'),
 ('tutor','Ingliz tili — 12-dars','Matematika — kasrlar','Speaking club','scheduled','done','cancelled'),
 ('vip','BTC/USDT long','ETH/USDT short','SOL/USDT long','open','profit','loss'),
 ('beauty','Manikyur + dizayn','Kiprik o''stirish','Soch bo''yash','booked','done','no_show'),
 ('fitness','Ozish dasturi 8 hafta','Massa yig''ish','Uy mashg''ulotlari','active','completed','paused'),
 ('doctor','Kardiolog konsultatsiyasi','Tahlil natijalari','Qayta ko''rik','booked','done','no_show'),
 ('psychologist','Birinchi seans','Xavotir bilan ishlash','Juftlik seansi','booked','done','no_show'),
 ('realestate','3 xonali, Chilonzor','2 xonali, Yunusobod','Hovli, Qibray','available','reserved','sold'),
 ('logistics','Yuk xati #1042','Yuk xati #1043','Yuk xati #1044','loaded','on_way','delivered'),
 ('educenter','IELTS 7.0 guruhi','DTM matematika','Mock test guruhi','active','full','finished'))
INSERT INTO public.records (owner_id, title, client, status, amount, due_date)
SELECT o.telegram_id, x.t, x.c, x.s, x.a, current_date + x.d
FROM public.tg_owners o JOIN r ON r.niche = o.niche
CROSS JOIN LATERAL (VALUES (r.t1,'Aziza Karimova',r.s1,400000,2),(r.t2,'Otabek Rahimov',r.s2,650000,-1),(r.t3,'Gulnora Tosheva',r.s3,250000,-5)) x(t,c,s,a,d)
WHERE o.is_demo;

INSERT INTO public.insights (owner_id, positive, neutral, negative, topics, positive_drivers, negative_drivers, summary, message_count, created_at)
SELECT o.telegram_id, v.p, v.n, 100 - v.p - v.n,
 '[{"topic":"Narxlar","count":24,"sentiment":"neutral"},{"topic":"Xizmat sifati","count":18,"sentiment":"positive"},{"topic":"Kechikishlar","count":9,"sentiment":"negative"}]'::jsonb,
 '["Tez javob berish","Sifatli xizmat","Qulay jadval"]'::jsonb,
 '["Javob kechikishi","Narx oshgani"]'::jsonb,
 'A''zolar umuman mamnun, ayniqsa xizmat sifatidan. Asosiy norozilik javob kechikishi bilan bog''liq.', 180, now() - (v.d || ' days')::interval
FROM public.tg_owners o CROSS JOIN (VALUES (62,23,0),(55,27,7),(48,30,14)) v(p,n,d) WHERE o.is_demo;

INSERT INTO public.question_clusters (owner_id, question, ask_count, sources)
SELECT o.telegram_id, q.q, q.c, '[]'::jsonb
FROM public.tg_owners o CROSS JOIN (VALUES ('Narxi qancha?',14),('To''lovni qaysi kartaga qilaman?',9),('Qachon bo''sh vaqt bor?',6)) q(q,c) WHERE o.is_demo;
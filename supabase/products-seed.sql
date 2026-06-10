-- Skinlu — catalogue produits initial
-- Exécuter APRÈS supabase/schema.sql dans l'éditeur SQL Supabase.
-- Affiliate tag : skinlu-21
-- image_url : null → à renseigner via Table Editor (onglet products) une fois le catalogue live.
-- product_type valeurs supportées par le moteur : cleanser | serum | moisturizer | spf

truncate table products restart identity cascade;

insert into products (
  name, brand, concerns, skin_types,
  product_type, routine_step, step_order,
  affiliate_url, image_url, price_eur
) values

-- ── CLEANSERS ────────────────────────────────────────────────────
(
  'Hydrating Cleanser',
  'CeraVe',
  array['dehydration', 'sensitivity'],
  array['dry', 'sensitive', 'normal'],
  'cleanser', 'both', 10,
  'https://www.amazon.fr/dp/B00D7BZJ3C?tag=skinlu-21',
  null, 10.99
),
(
  'Effaclar Gel Purifiant',
  'La Roche-Posay',
  array['acne', 'enlarged_pores'],
  array['oily', 'combination', 'sensitive'],
  'cleanser', 'both', 10,
  'https://www.amazon.fr/dp/B003JSEGNC?tag=skinlu-21',
  null, 8.50
),
(
  'Sensibio H2O',
  'Bioderma',
  array['sensitivity', 'dehydration'],
  array['sensitive', 'dry', 'normal'],
  'cleanser', 'both', 10,
  'https://www.amazon.fr/dp/B002XZLAWM?tag=skinlu-21',
  null, 14.90
),
(
  'Cleanance Gel Nettoyant',
  'Avène',
  array['acne', 'enlarged_pores'],
  array['oily', 'combination', 'sensitive'],
  'cleanser', 'both', 10,
  'https://www.amazon.fr/dp/B08JGPSWTZ?tag=skinlu-21',
  null, 7.50
),
(
  'Foaming Facial Cleanser',
  'CeraVe',
  array['acne', 'enlarged_pores', 'dullness'],
  array['oily', 'combination', 'normal'],
  'cleanser', 'both', 10,
  'https://www.amazon.fr/dp/B01N1BSR2J?tag=skinlu-21',
  null, 11.50
),
(
  'Toleriane Hydrating Gentle Cleanser',
  'La Roche-Posay',
  array['sensitivity', 'dehydration'],
  array['sensitive', 'dry', 'normal'],
  'cleanser', 'both', 10,
  'https://www.amazon.fr/dp/B01N7T4KKQ?tag=skinlu-21',
  null, 13.90
),

-- ── SÉRUMS ───────────────────────────────────────────────────────
(
  'Hyaluronic Acid 2% + B5',
  'The Ordinary',
  array['dehydration', 'dullness'],
  array['dry', 'normal', 'combination', 'oily', 'sensitive'],
  'serum', 'both', 30,
  'https://www.amazon.fr/dp/B01MYEZPC8?tag=skinlu-21',
  null, 7.50
),
(
  'Niacinamide 10% + Zinc 1%',
  'The Ordinary',
  array['acne', 'enlarged_pores', 'dullness'],
  array['oily', 'combination', 'normal'],
  'serum', 'both', 30,
  'https://www.amazon.fr/dp/B01MDTVZTZ?tag=skinlu-21',
  null, 6.30
),
(
  'Retinol B3 Serum',
  'La Roche-Posay',
  array['aging', 'dark_spots', 'dullness'],
  array['normal', 'dry', 'combination'],
  'serum', 'evening', 30,
  'https://www.amazon.fr/dp/B07Z9Y4M3C?tag=skinlu-21',
  null, 28.00
),
(
  '2% BHA Liquid Exfoliant',
  'Paula''s Choice',
  array['acne', 'enlarged_pores', 'dullness', 'dark_spots'],
  array['oily', 'combination', 'normal'],
  'serum', 'evening', 30,
  'https://www.amazon.fr/dp/B00949CTQQ?tag=skinlu-21',
  null, 35.00
),
(
  'Sérum Vitamine C 10%',
  'Typology',
  array['dark_spots', 'dullness', 'aging'],
  array['normal', 'combination', 'oily'],
  'serum', 'morning', 30,
  'https://www.amazon.fr/s?k=Typology+Serum+Vitamine+C&tag=skinlu-21',
  null, 25.00
),
(
  'Hyalu B5 Sérum',
  'La Roche-Posay',
  array['dehydration', 'sensitivity', 'aging'],
  array['dry', 'sensitive', 'normal', 'combination'],
  'serum', 'both', 30,
  'https://www.amazon.fr/dp/B09B1FHV5D?tag=skinlu-21',
  null, 27.50
),
(
  'Crystal Retinal 3',
  'Medik8',
  array['aging', 'dark_spots', 'dullness'],
  array['normal', 'dry', 'combination'],
  'serum', 'evening', 30,
  'https://www.amazon.fr/s?k=Medik8+Crystal+Retinal+3&tag=skinlu-21',
  null, 35.00
),
(
  'Lactic Acid 10% + HA',
  'The Ordinary',
  array['dullness', 'dark_spots', 'enlarged_pores'],
  array['normal', 'dry', 'combination'],
  'serum', 'evening', 30,
  'https://www.amazon.fr/dp/B07NDNPCKW?tag=skinlu-21',
  null, 7.30
),
(
  'Ascorbyl Glucoside Solution 12%',
  'The Ordinary',
  array['dark_spots', 'dullness', 'aging'],
  array['dry', 'normal', 'combination', 'sensitive'],
  'serum', 'morning', 30,
  'https://www.amazon.fr/dp/B01N9SPQHX?tag=skinlu-21',
  null, 10.50
),
(
  'Caffeine Solution 5% + EGCG',
  'The Ordinary',
  array['dullness', 'aging'],
  array['dry', 'normal', 'combination', 'oily'],
  'serum', 'both', 35,
  'https://www.amazon.fr/dp/B07GLNN427?tag=skinlu-21',
  null, 7.30
),

-- ── HYDRATANTS ───────────────────────────────────────────────────
(
  'Moisturizing Cream',
  'CeraVe',
  array['dehydration', 'sensitivity'],
  array['dry', 'sensitive', 'normal'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/dp/B0853C7CFQ?tag=skinlu-21',
  null, 12.50
),
(
  'Effaclar Mat',
  'La Roche-Posay',
  array['acne', 'enlarged_pores'],
  array['oily', 'combination'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/dp/B00EKDV674?tag=skinlu-21',
  null, 14.50
),
(
  'Cicaplast Baume B5+',
  'La Roche-Posay',
  array['sensitivity', 'dehydration'],
  array['dry', 'sensitive', 'normal'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/dp/B0060OUV5Y?tag=skinlu-21',
  null, 12.50
),
(
  'Hydro Boost Water Gel',
  'Neutrogena',
  array['dehydration', 'dullness'],
  array['normal', 'combination', 'oily'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/s?k=Neutrogena+Hydro+Boost+Water+Gel&tag=skinlu-21',
  null, 18.00
),
(
  'Hydrance Optimale Légère',
  'Avène',
  array['dehydration', 'sensitivity'],
  array['normal', 'combination', 'sensitive'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/s?k=Avene+Hydrance+Optimale+Legere&tag=skinlu-21',
  null, 15.00
),
(
  'Toleriane Ultra',
  'La Roche-Posay',
  array['sensitivity', 'dehydration'],
  array['sensitive', 'dry'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/dp/B00ES7DQIU?tag=skinlu-21',
  null, 17.50
),
(
  'Normaderm Phytosolution',
  'Vichy',
  array['acne', 'enlarged_pores', 'dullness'],
  array['oily', 'combination'],
  'moisturizer', 'both', 40,
  'https://www.amazon.fr/dp/B089MJTPBL?tag=skinlu-21',
  null, 14.90
),
(
  'PM Facial Moisturizing Lotion',
  'CeraVe',
  array['dehydration', 'aging'],
  array['dry', 'normal', 'sensitive', 'combination'],
  'moisturizer', 'evening', 40,
  'https://www.amazon.fr/dp/B000YJ2SLG?tag=skinlu-21',
  null, 13.00
),

-- ── SPF ──────────────────────────────────────────────────────────
(
  'Anthelios UVMune 400 Invisible Fluid SPF 50+',
  'La Roche-Posay',
  array['dark_spots', 'aging', 'sensitivity'],
  array['dry', 'normal', 'combination', 'oily', 'sensitive'],
  'spf', 'morning', 50,
  'https://www.amazon.fr/dp/B09SLDHKTN?tag=skinlu-21',
  null, 16.50
),
(
  'Cleanance Solaire SPF 50+',
  'Avène',
  array['acne', 'dark_spots', 'enlarged_pores'],
  array['oily', 'combination', 'sensitive'],
  'spf', 'morning', 50,
  'https://www.amazon.fr/s?k=Avene+Cleanance+Solaire+SPF+50&tag=skinlu-21',
  null, 14.00
),
(
  'SPF 50 Fluide Quotidien',
  'Typology',
  array['dark_spots', 'aging', 'dullness'],
  array['normal', 'combination', 'dry'],
  'spf', 'morning', 50,
  'https://www.amazon.fr/s?k=Typology+SPF+50+Quotidien&tag=skinlu-21',
  null, 19.00
),
(
  'Mineral SPF 50+ Tinted',
  'CeraVe',
  array['dark_spots', 'sensitivity', 'dehydration'],
  array['dry', 'normal', 'combination', 'sensitive'],
  'spf', 'morning', 50,
  'https://www.amazon.fr/s?k=CeraVe+Mineral+SPF+50+Tinted&tag=skinlu-21',
  null, 18.00
),
(
  'Photoderm AR Crème Teintée SPF 50+',
  'Bioderma',
  array['sensitivity', 'acne', 'dark_spots'],
  array['sensitive', 'dry', 'normal'],
  'spf', 'morning', 50,
  'https://www.amazon.fr/s?k=Bioderma+Photoderm+AR+Teintee&tag=skinlu-21',
  null, 15.50
);

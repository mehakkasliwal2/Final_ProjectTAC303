-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  packaging TEXT,
  price_tier TEXT,
  website TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Join table (many-to-many)
CREATE TABLE IF NOT EXISTS brand_certifications (
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  certification_id INTEGER REFERENCES certifications(id) ON DELETE CASCADE,
  PRIMARY KEY (brand_id, certification_id)
);

-- Sample seed data
INSERT INTO brands (name, summary, packaging, price_tier, website, country) VALUES
('Biossance', 'Lab-grown squalane skincare backed by EWG verification and Responsible Care commitments.', 'Sugarcane biopolymer, refill pouches', '$$', 'https://www.biossance.com', 'USA'),
('ILIA Beauty', 'Weightless color cosmetics disclosing recycled aluminum percentages and funding take-back programs.', 'Recycled aluminum, mail-back recycling', '$$', 'https://iliabeauty.com', 'USA'),
('Youth To The People', 'Superfood-powered cleansers brewed weekly in California with transparent supplier maps.', 'Glass bottles, FSC cartons', '$$', 'https://www.youthtothepeople.com', 'USA')
ON CONFLICT DO NOTHING;

INSERT INTO certifications (name) VALUES
('EWG Verified'),
('Leaping Bunny'),
('B Corp'),
('Climate Neutral'),
('Vegan')
ON CONFLICT DO NOTHING;

INSERT INTO brand_certifications (brand_id, certification_id)
SELECT b.id, c.id FROM brands b JOIN certifications c ON b.name = 'Biossance' AND c.name IN ('EWG Verified', 'Leaping Bunny')
ON CONFLICT DO NOTHING;

INSERT INTO brand_certifications (brand_id, certification_id)
SELECT b.id, c.id FROM brands b JOIN certifications c ON b.name = 'ILIA Beauty' AND c.name IN ('B Corp', 'Leaping Bunny')
ON CONFLICT DO NOTHING;

INSERT INTO brand_certifications (brand_id, certification_id)
SELECT b.id, c.id FROM brands b JOIN certifications c ON b.name = 'Youth To The People' AND c.name IN ('Climate Neutral', 'Vegan')
ON CONFLICT DO NOTHING;

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  packaging TEXT,
  price_tier TEXT,
  website TEXT,
  country TEXT,
  image_url TEXT,
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
INSERT INTO brands (name, summary, packaging, price_tier, website, country, image_url) VALUES
('Biossance', 'Lab-grown squalane skincare backed by EWG verification and Responsible Care commitments.', 'Sugarcane biopolymer, refill pouches', '$$', 'https://www.biossance.com', 'USA', 'https://images.unsplash.com/photo-1676803704299-b59cd8fecb7d?auto=format&fit=crop&q=80&w=1200'),
('ILIA Beauty', 'Weightless color cosmetics disclosing recycled aluminum percentages and funding take-back programs.', 'Recycled aluminum, mail-back recycling', '$$', 'https://iliabeauty.com', 'USA', 'https://iliabeauty.com/cdn/shop/files/WEB-About_Us-_Image_Update_2025-0.jpg?v=1738871646&width=1500'),
('Youth To The People', 'Superfood-powered cleansers brewed weekly in California with transparent supplier maps.', 'Glass bottles, FSC cartons', '$$', 'https://www.youthtothepeople.com', 'USA', 'https://blogscdn.thehut.net/app/uploads/sites/1778/2021/12/Blog-700x400_0007_YouthToThePeople_BOTM_3StepSuperfoodStarterKit_HighRes_1638532910.jpg')
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

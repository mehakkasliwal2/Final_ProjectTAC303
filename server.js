import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const brandImages = {
  Biossance: 'https://images.unsplash.com/photo-1676803704299-b59cd8fecb7d?auto=format&fit=crop&q=80&w=1200',
  'ILIA Beauty': 'https://iliabeauty.com/cdn/shop/files/WEB-About_Us-_Image_Update_2025-0.jpg?v=1738871646&width=1500',
  'Youth To The People': 'https://blogscdn.thehut.net/app/uploads/sites/1778/2021/12/Blog-700x400_0007_YouthToThePeople_BOTM_3StepSuperfoodStarterKit_HighRes_1638532910.jpg',
  default: 'https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&q=80&w=1200'
};

function withBrandImage(brand) {
  const image_url = brand.image_url || brandImages[brand.name] || brandImages.default;
  return { ...brand, image_url };
}

const sampleBrands = [
  {
    id: 1,
    name: 'Biossance',
    summary: 'Lab-grown squalane skincare backed by EWG verification and Responsible Care commitments.',
    certifications: ['EWG Verified', 'Leaping Bunny'],
    packaging: 'Sugarcane biopolymer, refill pouches',
    price_tier: '$$'
  },
  {
    id: 2,
    name: 'ILIA Beauty',
    summary: 'Weightless color cosmetics disclosing recycled aluminum percentages and funding take-back programs.',
    certifications: ['B Corp', 'Leaping Bunny'],
    packaging: 'Recycled aluminum, mail-back recycling',
    price_tier: '$$'
  },
  {
    id: 3,
    name: 'Youth To The People',
    summary: 'Superfood-powered cleansers brewed weekly in California with transparent supplier maps.',
    certifications: ['Climate Neutral', 'Vegan'],
    packaging: 'Glass bottles, FSC cartons',
    price_tier: '$$'
  }
];

async function getBrands({ limit = 6, offset = 0 } = {}) {
  if (!pool) return { rows: sampleBrands.slice(offset, offset + limit), total: sampleBrands.length };
  const client = await pool.connect();
  try {
    const totalResult = await client.query('SELECT COUNT(*) AS count FROM brands;');
    const result = await client.query(
      `SELECT b.id, b.name, b.summary, b.packaging, b.price_tier,
              b.image_url,
              COALESCE(array_agg(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS certifications
       FROM brands b
       LEFT JOIN brand_certifications bc ON bc.brand_id = b.id
       LEFT JOIN certifications c ON c.id = bc.certification_id
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );
    return { rows: result.rows, total: parseInt(totalResult.rows[0].count, 10) };
  } finally {
    client.release();
  }
}

async function getBrandById(id) {
  if (!pool) return sampleBrands.find(b => b.id === Number(id));
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT b.id, b.name, b.summary, b.packaging, b.price_tier, b.website, b.country, b.image_url,
              COALESCE(array_agg(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS certifications
       FROM brands b
       LEFT JOIN brand_certifications bc ON bc.brand_id = b.id
       LEFT JOIN certifications c ON c.id = bc.certification_id
       WHERE b.id = $1
       GROUP BY b.id;`,
      [id]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getCertificationCounts() {
  if (!pool) {
    const counts = {};
    sampleBrands.forEach(b => (b.certifications || []).forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT c.name, COUNT(DISTINCT bc.brand_id) AS count
       FROM certifications c
       JOIN brand_certifications bc ON bc.certification_id = c.id
       GROUP BY c.name
       ORDER BY count DESC, c.name;`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function createBrand(payload) {
  if (!pool) {
    const id = sampleBrands.length + 1;
    sampleBrands.push({ id, ...payload });
    return { id, ...payload };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const brandResult = await client.query(
      `INSERT INTO brands(name, summary, packaging, price_tier, website, country)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      [payload.name, payload.summary, payload.packaging, payload.price_tier, payload.website, payload.country]
    );
    const brandId = brandResult.rows[0].id;

    if (payload.certifications && payload.certifications.length) {
      for (const cert of payload.certifications) {
        const certResult = await client.query(
          `INSERT INTO certifications(name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [cert]
        );
        const certId = certResult.rows[0].id;
        await client.query(
          `INSERT INTO brand_certifications(brand_id, certification_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [brandId, certId]
        );
      }
    }

    await client.query('COMMIT');
    return { id: brandId, ...payload };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateBrand(id, payload) {
  if (!pool) {
    const idx = sampleBrands.findIndex(b => b.id === Number(id));
    if (idx === -1) return null;
    sampleBrands[idx] = { ...sampleBrands[idx], ...payload, id: Number(id) };
    return sampleBrands[idx];
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE brands
       SET name = $1, summary = $2, packaging = $3, price_tier = $4, website = $5, country = $6
       WHERE id = $7;`,
      [payload.name, payload.summary, payload.packaging, payload.price_tier, payload.website, payload.country, id]
    );
    await client.query('DELETE FROM brand_certifications WHERE brand_id = $1;', [id]);
    if (payload.certifications && payload.certifications.length) {
      for (const cert of payload.certifications) {
        const certResult = await client.query(
          `INSERT INTO certifications(name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [cert]
        );
        const certId = certResult.rows[0].id;
        await client.query(
          `INSERT INTO brand_certifications(brand_id, certification_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [id, certId]
        );
      }
    }
    await client.query('COMMIT');
    return { id: Number(id), ...payload };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteBrand(id) {
  if (!pool) {
    const idx = sampleBrands.findIndex(b => b.id === Number(id));
    if (idx !== -1) sampleBrands.splice(idx, 1);
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM brands WHERE id = $1;', [id]);
  } finally {
    client.release();
  }
}

function validateBrandInput(body) {
  const errors = {};
  const urlRegex = /^(https?:\/\/)[\w.-]+(\.[\w.-]+)+(\/[^\s]*)?$/i;
  if (!body.name || body.name.trim().length < 2) errors.name = 'Brand name must be at least 2 characters.';
  if (!body.summary || body.summary.trim().length < 10) errors.summary = 'Summary should be at least 10 characters.';
  if (body.website && !urlRegex.test(body.website.trim())) errors.website = 'Website must be a valid URL starting with http(s).';
  if (!body.price_tier) errors.price_tier = 'Select a price tier.';
  return errors;
}

app.get('/', async (req, res, next) => {
  try {
    const { rows } = await getBrands({ limit: 3, offset: 0 });
    const brands = rows.map(withBrandImage);
    res.render('home', { brands });
  } catch (err) {
    next(err);
  }
});

app.get('/browse', async (req, res, next) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = 6;
  const offset = (page - 1) * limit;
  try {
    const { rows, total } = await getBrands({ limit, offset });
    const brands = rows.map(withBrandImage);
    const certCounts = await getCertificationCounts();
    const pageCount = Math.max(1, Math.ceil(total / limit));
    res.render('browse', { brands, page, pageCount, certCounts });
  } catch (err) {
    next(err);
  }
});

app.get('/submit', (req, res) => {
  res.render('submit', { errors: {}, values: {} });
});

app.post('/submit', async (req, res, next) => {
  const { name, summary, packaging, price_tier, website, country, certifications } = req.body;
  const certList = Array.isArray(certifications)
    ? certifications.filter(Boolean)
    : (certifications || '').split(',').map(c => c.trim()).filter(Boolean);

  const errors = validateBrandInput({ name, summary, price_tier, website });
  if (Object.keys(errors).length) {
    return res.status(400).render('submit', { errors, values: req.body });
  }

  try {
    await createBrand({ name, summary, packaging, price_tier, website, country, certifications: certList });
    res.redirect('/browse');
  } catch (err) {
    next(err);
  }
});

app.get('/brands/:id/edit', async (req, res, next) => {
  try {
    const brand = await getBrandById(req.params.id);
    if (!brand) return res.status(404).render('error', { message: 'Brand not found.' });
    res.render('edit', { errors: {}, values: brand, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.post('/brands/:id/edit', async (req, res, next) => {
  const { name, summary, packaging, price_tier, website, country, certifications } = req.body;
  const certList = Array.isArray(certifications)
    ? certifications.filter(Boolean)
    : (certifications || '').split(',').map(c => c.trim()).filter(Boolean);

  const errors = validateBrandInput({ name, summary, price_tier, website });
  if (Object.keys(errors).length) {
    return res.status(400).render('edit', { errors, values: { ...req.body, certifications }, id: req.params.id });
  }

  try {
    await updateBrand(req.params.id, { name, summary, packaging, price_tier, website, country, certifications: certList });
    res.redirect('/browse');
  } catch (err) {
    next(err);
  }
});

app.post('/brands/:id/delete', async (req, res, next) => {
  try {
    await deleteBrand(req.params.id);
    res.redirect('/browse');
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

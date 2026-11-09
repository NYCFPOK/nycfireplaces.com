// Turns migration/projects-raw.json (harvested from the public project pages
// of the WordPress site) into editable content files + optimised local images.
//   node migration/import-projects.mjs
// Safe to re-run: existing images are skipped. Hand edits to a project's JSON
// are preserved for the fields listed in KEEP.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname;
const raw = JSON.parse(fs.readFileSync(path.join(root, 'migration/projects-raw.json'), 'utf8'));
const outDir = path.join(root, 'src/content/projects');
const imgDir = path.join(root, 'src/assets/projects');
const MAX_IMAGES = 4;
const KEEP = ['featured', 'order', 'summary', 'goal', 'solution', 'ourRole', 'takeaway', 'category', 'draft'];
fs.mkdirSync(outDir, { recursive: true });

const slugify = (s) => s.toLowerCase().replace(/[”“"'’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '');
const clean = (s) => s.replace(/\?{2,}/g, '').replace(/\s\?(\s|$)/g, '$1').replace(/[ \t]+/g, ' ').replace(/\s+([.,!])/g, '$1').trim();
const info = (p, key) => (p.info.find((i) => i.startsWith(key + ':')) || '').slice(key.length + 1).trim();

function category(p) {
  const t = p.title.toLowerCase();
  const m = (p.meta.match(/state of the art (.*?) at NYC/) || [])[1] || '';
  if (/pizza|kitchen|grill|island|cabinet|refriger|bbq|kamado|bar\b/.test(t) && !/fireplace|insert|log set|gas log/.test(t)) return 'outdoor-kitchen';
  if (/fire ?pit|fire table|heater|pergola|patio|fire bowl|fire feature/.test(t) && !/kitchen/.test(t)) return 'outdoor-living';
  if (/insert|conversion|convert|log set|gas log|logs|doors?\b|burner/.test(t)) return 'fireplace-upgrade';
  if (/fireplace|stove|mantel|linear|electric|water vapor|ethanol|hearth/.test(t)) return 'fireplace-new';
  if (/Grills/.test(m)) return 'outdoor-kitchen';
  if (/Fire Pits/.test(m)) return 'outdoor-living';
  return 'fireplace-new';
}

const seen = new Set();
const entries = Object.entries(raw).sort((a, b) => Number(a[0]) - Number(b[0]));
let done = 0;
for (const [id, p] of entries) {
  if (!p.title) continue;
  let slug = slugify(p.title);
  if (seen.has(slug)) slug = `${slug}-${id}`;
  seen.add(slug);

  const full = p.imgs.slice(1).filter((u) => !/-\d+x\d+\.(webp|jpe?g|png)$/i.test(u)).slice(0, MAX_IMAGES);
  const images = [];
  for (let i = 0; i < full.length; i++) {
    const rel = `${slug}/${i + 1}.webp`;
    const file = path.join(imgDir, rel);
    if (!fs.existsSync(file)) {
      const url = new URL(full[i], 'https://www.nycfireplaces.com').href;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(file);
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        console.log('image failed', id, url, String(e));
        continue;
      }
    }
    images.push(`../../assets/projects/${rel}`);
  }
  if (!images.length) { console.log('no images, skipped', id, p.title); continue; }

  const desc = clean((p.text.split(/\nDescription\n/)[1] || '').split(/\n(?:Features|Share)\n/)[0] || '');
  const features = ((p.text.split(/\nFeatures\n/)[1] || '').split(/\nShare\n/)[0] || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const location = info(p, 'Location');
  const file = path.join(outDir, `${slug}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const next = {
    title: p.title.replace(/\s+/g, ' ').replace(/ w\/ /g, ' with ').replace(/ feat\. /g, ' featuring '),
    legacyId: Number(id),
    year: p.year ? Number(p.year) : undefined,
    category: category(p),
    location: location && !/Showroom/.test(location) ? location.replace(', New York', ', NY').replace(', New Jersey', ', NJ') : undefined,
    designer: info(p, 'Designer') || undefined,
    beforeAfter: /before image/i.test(p.text) || /before (&|and) after/i.test(p.title) || undefined,
    description: desc || undefined,
    features: features.length ? features : undefined,
    images,
    featured: false,
  };
  for (const k of KEEP) if (prev[k] !== undefined) next[k] = prev[k];
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  done++;
}
console.log('projects written:', done);

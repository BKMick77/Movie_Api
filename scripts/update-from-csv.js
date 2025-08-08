require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const mongoose = require('mongoose');
const { Movie } = require('../models'); // adjust if your export differs

const DRY = process.argv.includes('--dry');
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const normScore = (v) => {
  if (isBlank(v)) return undefined;
  const n = String(v).replace('%', '').trim();
  return n === '' ? undefined : Number(n);
};

(async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Mongo connected');

  const rows = parse(fs.readFileSync('movies-update.csv'), {
    columns: true,
    skip_empty_lines: true,
  });

  let updated = 0,
    skipped = 0,
    notFound = 0,
    failed = 0;

  for (const row of rows) {
    const query =
      row._id && row._id.trim()
        ? { _id: row._id.trim() }
        : row.Title && row.Title.trim()
          ? { Title: row.Title.trim() }
          : null;

    if (!query) {
      skipped++;
      console.log('- skipped: no _id or Title');
      continue;
    }

    const $set = {};
    if (!isBlank(row.AppleTV)) $set['WatchLinks.AppleTV'] = row.AppleTV.trim();
    if (!isBlank(row.AmazonPrime))
      $set['WatchLinks.AmazonPrime'] = row.AmazonPrime.trim();
    if (!isBlank(row.RT_Link))
      $set['RottonTomatoes.0.Link'] = row.RT_Link.trim();

    const score = normScore(row.RT_Score);
    if (score !== undefined) {
      $set['RottonTomatoes.0.NumericScore'] = score;
      $set['RottonTomatoes.0.Score'] = `${score}%`;
    }

    if (Object.keys($set).length === 0) {
      skipped++;
      console.log('- skipped: nothing to set');
      continue;
    }

    if (DRY) {
      console.log('· DRY', query, { $set });
      continue;
    }

    try {
      const doc = await Movie.findOneAndUpdate(query, { $set }, { new: true });
      if (!doc) {
        notFound++;
        console.warn('?', row._id || row.Title, 'not found');
        continue;
      }
      updated++;
      console.log('✓', doc.Title);
    } catch (e) {
      failed++;
      console.error('x', row._id || row.Title || '(unknown)', e.message);
    }
  }

  console.log({ updated, skipped, notFound, failed });
  await mongoose.disconnect();
  console.log('🏁 Done');
})();

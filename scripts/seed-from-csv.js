// scripts/seed-from-csv.js
require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const axios = require('axios');
const mongoose = require('mongoose');

// reuse your model
const { Movie } = require('../models'); // adjust import if needed

const { MONGODB_URI, TMDB_KEY } = process.env;
if (!MONGODB_URI || !TMDB_KEY) {
  console.error('Missing MONGODB_URI or TMDB_KEY in .env');
  process.exit(1);
}

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: { api_key: TMDB_KEY, language: 'en-US' },
  timeout: 15000,
});

const img = (p, size = 'original') =>
  p ? `https://image.tmdb.org/t/p/${size}${p}` : undefined;

async function resolveTmdbId(title, year) {
  const { data } = await tmdb.get('/search/movie', {
    params: { query: title, year },
  });
  return data.results?.[0]?.id || null;
}

async function fetchBundle(id) {
  const [details, credits] = await Promise.all([
    tmdb.get(`/movie/${id}`),
    tmdb.get(`/movie/${id}/credits`),
  ]);
  return { d: details.data, c: credits.data };
}

function mapToSchema({ d, c }) {
  const director = (c.crew || []).find((p) => p.job === 'Director');
  const actors = (c.cast || []).slice(0, 5).map((a) => a.name); // top 5 names

  return {
    Title: d.title,
    Description: d.overview || 'No description available.',
    Genre: d.genres?.[0] ? { Name: d.genres[0].name } : undefined,
    Director: director
      ? {
          Name: director.name,
          Image: director.profile_path
            ? img(director.profile_path, 'w500')
            : undefined,
          // Bio intentionally omitted (you can fill later)
        }
      : undefined,
    Actors: actors,
    ImagePath: img(d.poster_path, 'w780'),
    BackdropPath: img(d.backdrop_path),
    Featured: false, // default; won’t overwrite existing due to $setOnInsert
    // WatchLinks: { ... }        // intentionally omitted
    // Comments: []               // omitted
    // RottonTomatoes: [ ... ]    // omitted
    ReleaseYear: d.release_date
      ? Number(d.release_date.slice(0, 4))
      : undefined,
  };
}

// Create if missing; leave existing docs untouched
async function upsertByTitle(doc) {
  return Movie.findOneAndUpdate(
    { Title: doc.Title },
    { $setOnInsert: doc },
    { upsert: true, new: true }
  );
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const rows = parse(fs.readFileSync('movies.csv'), {
    columns: true,
    skip_empty_lines: true,
  });

  for (const row of rows) {
    const title = row.Title?.trim();
    const year = row.Year ? Number(row.Year) : undefined;
    if (!title) continue;

    try {
      const id = await resolveTmdbId(title, year);
      if (!id) {
        console.warn(`No TMDB match for "${title}"`);
        continue;
      }

      const bundle = await fetchBundle(id);
      const doc = mapToSchema(bundle);
      const saved = await upsertByTitle(doc);
      console.log('Upserted:', saved.Title);
    } catch (e) {
      console.error(`Failed for "${title}":`, e.message);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

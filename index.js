const express = require('express'),
  morgan = require('morgan');

const fs = require('fs');
const path = require('path');

const app = express();

app.use(morgan('common'));

let bestPicture = [
  {
    title: 'A Beautiful Mind',
    director: 'Ron Howard',
    year: '2001',
  },
  {
    title: 'Chicago',
    director: 'Rob Marshall',
    year: '2002',
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    director: 'Peter Jackson',
    year: '2003',
  },
  {
    title: 'Million Dollar Baby',
    director: 'Clint Eastwood',
    year: '2004',
  },
  {
    title: 'Crash',
    director: 'Paul Haggis',
    year: '2004',
  },
  {
    title: 'The Departed',
    director: 'Martin Scorsese',
    year: '2005',
  },
  {
    title: 'No Country for Old Men',
    director: 'Joel and Ethan Coen',
    year: '2006',
  },
  {
    title: 'Slumdog Millionaire',
    director: 'Danny Boyle',
    year: '2007',
  },
  {
    title: 'The Hurt Locker',
    director: 'Kathryn Bigelow',
    year: '2008',
  },
  {
    title: 'The King’s Speech',
    director: 'Tom Hooper',
    year: '2009',
  },
];

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Who wants to watch a movie?');
});

app.get('/movies', (req, res) => {
  res.json(bestPicture);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("🚨It's Broken🚨");
});

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});

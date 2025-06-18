const mongoose = require('mongoose');
const models = require('./models.js');

const Movies = models.Movie;
const Users = models.User;

mongoose.connect('mongodb://localhost:27017/movie_api', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const express = require('express'),
  morgan = require('morgan'),
  uuid = require('uuid');

const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('common'));

// let users = [
//   {
//     name: 'Jack',
//     favoriteMovie: ['Fight Club'],
//     id: 1,
//   },

//   {
//     name: 'Sara',
//     favoriteMovie: ['Lilo & Stitch'],
//     id: 2,
//   },
// ];

// let movies = [
//   {
//     title: 'A Beautiful Mind',
//     director: {
//       name: 'Ron Howard',
//     },
//     year: '2001',
//     genre: {
//       name: 'Drama',
//       description:
//         'A drama is a genre that focuses on realistic characters, emotional themes, and intense, often personal conflicts to explore the human experience.',
//     },
//   },

//   {
//     title: 'The Lord of the Rings: The Return of the King',
//     director: {
//       name: 'Peter Jackson',
//     },
//     year: '2003',
//     genre: {
//       name: 'Fantasy',
//       description:
//         'Fantasy is a genre that features magical or supernatural elements set in imaginary worlds, often involving epic quests, mythical creatures, and heroic characters.',
//     },
//   },

//   {
//     title: 'No Country for Old Men',
//     director: {
//       name: 'Joel and Ethan Coen',
//     },
//     year: '2007',
//     genre: {
//       name: 'Thriller',
//       description:
//         'A thriller is a genre built around suspense, tension, and high stakes, keeping audiences on edge through twists, danger, and psychological intensity.',
//     },
//   },
// ];

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.static('public'));

//Create user data
app.post('/users', (req, res) => {
  const newUser = req.body;

  if (newUser.name) {
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).json(newUser);
  } else {
    res.status(400).send('User Name Required');
  }
});

//Update user data
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body;

  let user = users.find((user) => user.id == id);

  if (user) {
    user.name = updatedUser.name;
    res.status(200).json(user);
  } else {
    res.status(400).send('User Not Found');
  }
});

//Add favorite movie
app.post('/users/:id/:movieTitle', (req, res) => {
  const { id, movieTitle } = req.params;

  let user = users.find((user) => user.id == id);

  if (user) {
    user.favoriteMovie.push(movieTitle);
    res.status(200).send(`${movieTitle} has been added to user ${id} array`);
  } else {
    res.status(400).send('Movie Not Found');
  }
});

//Delete user movie
app.delete('/users/:id/:movieTitle', (req, res) => {
  const { id, movieTitle } = req.params;

  let user = users.find((user) => user.id == id);

  if (user) {
    user.favoriteMovie = user.favoriteMovie.filter(
      (title) => title !== movieTitle
    );
    res.status(200).send(`${movieTitle} has been removed to user ${id} array`);
  } else {
    res.status(400).send('User Not Found');
  }
});

//Delete user data
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  let user = users.find((user) => user.id == id);

  if (user) {
    users = users.filter((users) => users.id != id);
    res.status(200).send(`User ${id} has been removed`);
  } else {
    res.status(400).send('User Not Found');
  }
});

//Read data of all users
app.get('/users', (req, res) => {
  res.status(200).json(users);
});

//Read data of all movies
app.get('/movies', (req, res) => {
  res.status(200).json(movies);
});

//Read data of one movie
app.get('/movies/:title', (req, res) => {
  const { title } = req.params;
  const movie = movies.find((movie) => movie.title === title);

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(400).send('Movie Not Found');
  }
});

//Read genre data
app.get('/movies/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find((movie) => movie.genre.name === genreName).genre;

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(400).send('Genre Not Found');
  }
});

//Read director data
app.get('/movies/director/:directorName', (req, res) => {
  const { directorName } = req.params;
  const director = movies.find(
    (movie) => movie.director.name === directorName
  ).director;

  if (director) {
    res.status(200).json(director);
  } else {
    res.status(400).send('Director Not Found');
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("🚨It's Broken🚨");
});

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});

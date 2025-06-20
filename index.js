const mongoose = require('mongoose');
const models = require('./models.js');

const Movies = models.Movie;
const Users = models.User;

mongoose.connect('mongodb://localhost:27017/movie_api', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const express = require('express');
morgan = require('morgan');

const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('common'));

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.static('public'));

//Create user data
// Format = json (mongoose)
app.post('/users', async (req, res) => {
  await Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users.create({
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        })
          .then((user) => {
            res.status(201).json(user);
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error:' + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error:' + error);
    });
});

//Update user data (mongoose)
//Format json
app.put('/users/:Username', async (req, res) => {
  await Users.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $set: {
        Username: req.body.Username,
        Password: req.body.Password,
        Email: req.body.Email,
        Birthday: req.body.Birthday,
      },
    },
    { new: true }
  )
    .then((updateUser) => {
      res.json(updateUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Add favorite movie (mongoose)
app.post('/users/:Username/movies/:MovieID', async (req, res) => {
  await Users.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $push: { FavoriteMovies: req.params.MovieID },
    },
    { new: true }
  )
    .then((updateUser) => {
      res.json(updateUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error' + err);
    });
});

//Delete user movie (mongoose)
app.delete('/users/:Username/movies/:MovieID', (req, res) => {
  Users.findOneAndUpdate(
    { Username: req.params.Username },
    { $pull: { FavoriteMovies: req.params.MovieID } },
    { new: true }
  )
    .then((updatedUser) => {
      if (!updatedUser) {
        res.status(404).send('User not found.');
      } else {
        res
          .status(200)
          .send(`Movie ${req.params.MovieID} was removed from favorites.`);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//Delete user data (mongoose)
app.delete('/users/:Username', (req, res) => {
  Users.findOneAndDelete({ Username: req.params.Username })
    .then((deletedUser) => {
      if (!deletedUser) {
        return res.status(404).send(`${req.params.Username} was not found.`);
      }
      res.status(200).send(`${req.params.Username} was deleted.`);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Read data of all users (mongoose)
app.get('/users', async (req, res) => {
  await Users.find()
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Read data of one user (mongoose)
app.get('/users/:Username', async (req, res) => {
  await Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Read data of all movies (mongoose)
app.get('/movies', async (req, res) => {
  await Movies.find()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Read data of one movie (mongoose)
app.get('/movies/:Title', async (req, res) => {
  await Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Read genre description (data mongoose)
app.get('/genre/:Name', (req, res) => {
  Movies.findOne({ 'Genre.Name': req.params.Name })
    .then((movie) => {
      if (movie) {
        res.json(movie.Genre.Description);
      } else {
        res.status(404).send('Genre not found.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//Read director (data mongoose)
app.get('/director/:Name', (req, res) => {
  Movies.findOne({ 'Director.Name': req.params.Name })
    .then((movie) => {
      if (movie) {
        res.json(movie.Director);
      } else {
        res.status(404).send('Director not found.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("🚨It's Broken🚨");
});

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});

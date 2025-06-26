const mongoose = require('mongoose');
const models = require('./models.js');

const Movies = models.Movie;
const Users = models.User;

mongoose.connect('mongodb://localhost:27017/movie_api');

const express = require('express'),
  morgan = require('morgan');

const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let auth = require('./auth')(app);

const cors = require('cors');
app.use(cors());

app.use(morgan('common'));

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {
  flags: 'a',
});

app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.static('public'));

const passport = require('passport');
require('./passport');

const requireAdmin = require('./admin');

const logRequest = require('./logRequests');
app.use(logRequest);

const logger = require('./logger');

// Create user data
// Format = json (mongoose)
// TODO: refactored to async/await try...catch - REFACTOR ALL ROUTES!
// implement express async handeler/global error handler
app.post('/users', async (req, res) => {
  const rawPassword = req.body.Password;

  // Validate password before hashing --not in user schema
  if (
    !/^(?=.*[A-Za-z])(?=.*\d|[^A-Za-z\d])[A-Za-z\d\W]{8,}$/.test(rawPassword)
  ) {
    return res
      .status(400)
      .send(
        'Password must be at least 8 characters long and contain a letter and a number or special character.'
      );
  }

  const hashedPassword = Users.hashPassword(rawPassword);

  try {
    const existingUser = await Users.findOne({ Username: req.body.Username });

    if (existingUser) {
      return res.status(400).send(`${req.body.Username} already exists`);
    }

    const newUser = await Users.create({
      Username: req.body.Username,
      Password: hashedPassword,
      Email: req.body.Email,
      Birthday: req.body.Birthday,
      //Admin: req.body.Admin, // temp to add admin privilege
    });

    logger.info(`User created: ${newUser.Username}`);
    res.status(201).json(newUser);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ errors: message });
    }

    logger.error(`Error creating user: ${error.message}`);
    console.error(error);
    res.status(500).send('Error: ' + error);
  }
});

//Update user data (mongoose)*
//Format json
app.put(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    // Condition to check credentials
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send('Permission Denied');
    }
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
      { new: true, runValidators: true }
    )
      .then((updateUser) => {
        logger.info(`User updated: ${user.Username}`);
        res.json(updateUser);
      })
      .catch((err) => {
        if (err.name === 'ValidationError') {
          const message = Object.values(err.error).map((e) => e.message);
          return res.status(400).json({ errors: message });
        }
        logger.error(`Error during user update: ${error.message}`);
        console.error(err);
        res.status(500).send('Error:' + err);
      });
  }
);

//Add favorite movie (mongoose)*
app.post(
  '/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    // Condition to check credentials
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send('Permission Denied');
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID },
      },
      { new: true }
    )
      .then((updateUser) => {
        logger.info(
          `Movie "${req.params.MovieId}" added to user ${req.params.Username}'s list`
        );
        res.json(updateUser);
      })
      .catch((err) => {
        logger.error(
          `Error adding movie ${req.params.MovieID} from ${req.params.Username}: ${err.message}`
        );
        console.error(err);
        res.status(500).send('Error' + err);
      });
  }
);

//Delete user movie (mongoose)*
app.delete(
  '/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    // Condition to check credentials
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send('Permission Denied');
    }
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      { $pull: { FavoriteMovies: req.params.MovieID } },
      { new: true }
    )
      .then((updatedUser) => {
        if (!updatedUser) {
          res.status(404).send('User not found.');
        } else {
          logger.info(
            `Movie ${req.params.MovieID} removed from ${req.params.Username}'s favorites`
          );
          res
            .status(200)
            .send(`Movie ${req.params.MovieID} was removed from favorites.`);
        }
      })
      .catch((err) => {
        logger.error(
          `Error removing movie ${req.params.MovieID} to ${req.params.Username}: ${err.message}`
        );
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Delete user data (mongoose)*
app.delete(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    // Condition to check credentials
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send('Permission Denied');
    }
    Users.findOneAndDelete({ Username: req.params.Username })
      .then((deletedUser) => {
        if (!deletedUser) {
          return res.status(404).send(`${req.params.Username} was not found.`);
        }
        logger.info(`User deleted: ${req.params.Username}`);
        res.status(200).send(`${req.params.Username} was deleted.`);
      })
      .catch((err) => {
        logger.error(`Error deleting user: ${error.message}`);
        console.error(err);
        res.status(500).send('Error:' + err);
      });
  }
);

// Get all user data -requires admin (mongoose)
app.get(
  '/users',
  passport.authenticate('jwt', { session: false }),
  requireAdmin,
  (req, res) => {
    Users.find()
      .then((users) => {
        res.status(200).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Read data of one user (mongoose)
app.get('/users/:Username', async (req, res) => {
  // Condition to check credentials
  if (req.user.Username !== req.params.Username) {
    return res.status(400).send('Permission Denied');
  }
  await Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error:' + err);
    });
});

//Read data of all movies (mongoose)*
app.get(
  '/movies',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    await Movies.find()
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error:' + err);
      });
  }
);

//Read data of one movie (mongoose)*
app.get(
  '/movies/:Title',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    await Movies.findOne({ Title: req.params.Title })
      .then((movie) => {
        res.json(movie);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error:' + err);
      });
  }
);

//Read genre description (mongoose)*
app.get(
  '/genre/:Name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
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
  }
);

//Read director (mongoose)*
app.get(
  '/director/:Name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
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
  }
);

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).send("🚨It's Broken🚨");
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});

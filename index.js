require('dotenv').config();

const mongoose = require('mongoose');
const models = require('./models.js');

const Movies = models.Movie;
const Users = models.User;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected locally'))
  .catch((err) => {
    console.error('❌ Mongoose connection failed:', err.message);
  });

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

app.use(express.static('public'));

const passport = require('passport');
require('./passport');

const requireAdmin = require('./admin');

const logger = require('./logger');
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// Create user data
// Format = json (mongoose)
// TODO: refactored to async/await try...catch - REFACTOR ALL ROUTES!
// implement express async handler/global error handler
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

  const isAdmin = req.body.adminSecret === process.env.ADMIN_SECRET;

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
      Admin: isAdmin, //adminSecret:
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
//Format json async/await hashedPassword/Admin
app.put(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    // Check if user is authorized to update
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send('Permission Denied');
    }

    try {
      // update object
      const updatedFields = {
        Username: req.body.Username,
        Email: req.body.Email,
        Birthday: req.body.Birthday,
        Admin: req.body.adminSecret === process.env.ADMIN_SECRET,
      };

      // validate & hash
      if (req.body.Password) {
        const rawPassword = req.body.Password;

        if (
          !/^(?=.*[A-Za-z])(?=.*\d|[^A-Za-z\d])[A-Za-z\d\W]{8,}$/.test(
            rawPassword
          )
        ) {
          return res
            .status(400)
            .send(
              'Password must be at least 8 characters long and contain a letter and a number or special character.'
            );
        }

        updatedFields.Password = Users.hashPassword(rawPassword);
      }

      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.Username },
        { $set: updatedFields },
        { new: true, runValidators: true }
      );

      logger.info(`User updated: ${updatedUser.Username}`);
      res.json(updatedUser);
    } catch (error) {
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({ errors: message });
      }

      logger.error(`Error during user update: ${error.message}`);
      console.error(error);
      res.status(500).send('Error: ' + error);
    }
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

app.get('/', (req, res) => {
  res.send('Welcome to MyFlix API');
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).send('🚨 Something went wrong 🚨');
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});

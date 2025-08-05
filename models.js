const mongoose = require('mongoose');

const bcrypt = require('bcrypt');

let movieSchema = mongoose.Schema({
  Title: { type: String, required: true },
  Description: { type: String, required: true },
  Genre: {
    Name: String,
    Description: String,
  },
  Director: {
    Name: String,
    Bio: String,
  },
  Actors: [String],

  ImagePath: String,

  BackdropPath: String,

  Featured: Boolean,

  WatchLinks: {
    AppleTV: { type: String },
    AmazonPrime: { type: String },
  },

  Comments: [
    {
      Username: { type: String, required: true },
      Content: { type: String, required: true },
      Rating: { type: Number, required: true, min: 1, max: 5 },
      PostedAt: { type: Date, default: Date.now },
    },
  ],

  ReleaseYear: Number,
});

let userSchema = mongoose.Schema({
  Username: {
    type: String,
    required: true,
    match: [
      /^[a-zA-Z0-9_]{3,20}$/,
      'Error: No special characters allowed in username.',
    ],
  },
  Password: {
    type: String,
    required: true,
  },
  Email: {
    type: String,
    required: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Error: Must format as email'],
  },
  Birthday: Date,
  FavoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  Admin: { type: Boolean },
});

userSchema.statics.hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

userSchema.methods.validatePassword = function (password) {
  return bcrypt.compareSync(password, this.Password);
};

let Movie = mongoose.model('Movie', movieSchema);
let User = mongoose.model('User', userSchema);

module.exports = {
  Movie,
  User,
};

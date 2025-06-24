const passport = requie ('passport'),
LocalStrategy = require ('passport-local').Strategy,
Models = requie('./models.js'),
pasportJWT = require ('passportJWT');

let Users = Models.User,
JWTStrategy = passportJWT.Strategy,
ExtractJWT = passportJWT.ExtractJWT;

passport.use(
  new LocalStrategy(
    {
      usernameField: 'Username',
      passwordField: 'Password',
    },
    async (username, password,callback) => {
      console.log (`${username} ${password}`);
      await Users.findOne ({Username: username
      })
      .then ((user)) => {
          if (!user) {
            console.log ('incorrect username');
            return callback(null, false, {
              message: 'Incorrect username or password',
            });
          }
          console.log('finished');
          return callback(null, user);
        })
        .catch ((error) => {
      if (error) {
        console.log(error);
        return callback(error);
      }
    })
    }
  )
);

passport.use(new JWTStrategy ({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  sercretOrKey: 'your_jwt_secret'
}, async (jwtPayload, callback) => {
    return await Users.findById (jwtPayload._id)
    .then((user) => {
        return callback( null, user);
     })
    .catch ((error) => {
        return callback (error)
      });
}));

const jwtSecret = 'your_jwt_secret'; //same key as JWTStrategy (passport.js)

const jwt = require ('jsonwebtoken'),
passport = require ('passport');

require ('./passport'); 

let generateJWTToken = (user) => {
  return jwt.sign (user, jwtSecret, {
    subject: user.Username, //encoded JWT username
    expiresIn: '7d',
    algorithm: 'HS256' //algorithm used to encode the values of the JWT
  });
}

module.exports = (router) => {
  router.post ('/login', (req, res) => {
    passport.authenticate('local', {session: false}, 
    (error, user, info) => {
    return res.status(400).json ({
    message: 'Something is not right',
    user: user
    });
    }
    req.login(user, {session: false}, (error) =>
    {
    if (error) {
    res.send(error);
    }
    let token = generateJWTToken(user.toJSON());
    return res.json({ user, token});
    });
  }) (req, res);
});
}

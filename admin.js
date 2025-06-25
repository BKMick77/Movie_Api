function requireAdmin(req, res, next) {
  if (req.user && req.user.Admin) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admins only.' });
}

module.exports = requireAdmin;

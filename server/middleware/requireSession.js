module.exports = function requireSession(req, res, next) {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: 'not logged in' });
    return;
  }
  next();
};

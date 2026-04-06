module.exports = function requirePin(req, res, next) {
  const pin = req.headers['x-app-pin'];
  const correctPin = process.env.APP_PIN || '1234';

  if (!pin || pin !== correctPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  next();
};

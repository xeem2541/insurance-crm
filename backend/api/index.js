module.exports = (req, res) => {
  try {
    const app = require('../src/app');
    return app(req, res);
  } catch (err) {
    res.status(500).json({
      error: "Failed to initialize backend app",
      message: err.message,
      stack: err.stack
    });
  }
};

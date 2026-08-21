try {
  const app = require('../src/app');
  module.exports = app;
} catch (err) {
  console.error("Initialization Error:", err);
  module.exports = (req, res) => {
    res.status(500).json({
      error: "Initialization failed",
      message: err.message,
      stack: err.stack
    });
  };
}

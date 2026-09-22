module.exports = async (req, res) => {
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

process.on('uncaughtException', (err) => {
  console.error('[Vercel Fatal] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Vercel Fatal] Unhandled Rejection:', reason);
});

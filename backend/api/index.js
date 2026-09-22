process.on('uncaughtException', (err) => {
  console.error('[Vercel Fatal] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Vercel Fatal] Unhandled Rejection:', reason);
});

try {
  const app = require('../src/app');
  module.exports = app;
} catch (err) {
  console.error('[Vercel Fatal] Initialization Error:', err);
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed', 
      message: err.message,
      stack: err.stack 
    });
  };
}

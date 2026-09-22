process.on('uncaughtException', (err) => {
  console.error('[Vercel Fatal] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Vercel Fatal] Unhandled Rejection:', reason);
});

const app = require('../src/app');
module.exports = app;


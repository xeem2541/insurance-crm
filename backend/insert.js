const { pool } = require('./src/db');
pool.query('INSERT INTO master_data (category, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', ['LINE_GROUP', 'U3e0ff6e6ad20258cb6499bf1253eb0e5', 'U3e0ff6e6ad20258cb6499bf1253eb0e5'])
  .then(() => {
    console.log('Success');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

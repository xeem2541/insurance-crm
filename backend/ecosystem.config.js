module.exports = {
  apps: [{
    name: "apple-insurance-backend",
    script: "./src/app.js",
    env_production: {
      NODE_ENV: "production",
    },
    env_staging: {
      NODE_ENV: "staging",
    }
  },
  {
    name: "backup-incremental",
    script: "./scripts/backup.js",
    args: "incremental",
    instances: 1,
    exec_mode: "fork",
    cron_restart: "0 */6 * * *", // Every 6 hours
    watch: false,
    autorestart: false, // Don't autorestart, let cron handle it
    env: {
      NODE_ENV: "production",
    }
  },
  {
    name: "backup-full",
    script: "./scripts/backup.js",
    args: "full",
    instances: 1,
    exec_mode: "fork",
    cron_restart: "0 2 * * *", // Every day at 2:00 AM
    watch: false,
    autorestart: false,
    env: {
      NODE_ENV: "production",
    }
  }]
}

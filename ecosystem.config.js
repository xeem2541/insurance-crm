module.exports = {
  apps: [
    {
      name: "insurance-backend",
      script: "./backend/src/app.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "insurance-frontend",
      script: "npm",
      args: "run preview", // or "run dev" if not built, but usually in PM2 you run built static files or a simple server
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};

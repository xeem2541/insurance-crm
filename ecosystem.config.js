module.exports = {
  apps: [
    {
      name: "insurance-backend",
      script: "./backend/src/app.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      // W-10: Use 'serve' (static file server) instead of 'vite preview' in production.
      // 'vite preview' is intended for local testing only.
      // Run 'npm install -g serve' once to make this available.
      // Build first: cd frontend && npm run build
      name: "insurance-frontend",
      script: "serve",
      args: "-s dist -l 5173",
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

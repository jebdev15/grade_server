module.exports = {
  apps: [
    {
      name: "grading-portal",         // ✅ Matches PM2 name in deploy-backend.yml
      script: "./app.js",           // ✅ Uses app.js entrypoint
      instances: 1,                        // ✅ Use 1 for cPanel shared hosting (max may exceed limits)
      exec_mode: "fork",                   // ✅ Use fork for cPanel (cluster may not be supported)
      watch: false,
      max_memory_restart: "1G",            // ✅ Lowered for shared hosting limits
      // This helps prevent a rapid-fire restart loop if the app crashes instantly
      min_uptime: "5s", 
      max_restarts: 10,
      
      // ✅ Development environment
      env: {
        NODE_ENV: "development",
        PORT: 3001,                        // ✅ Matches VITE_API_URL port in frontend .env
      },

      // ✅ Staging environment
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,                        // ✅ Staging port
      },

      // ✅ Production environment
      env_production: {
        NODE_ENV: "production",
        PORT: 80,
      },

      // ✅ Log management
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
// PM2 process configuration for Sooket.
// Usage:
//   npm run build
//   pm2 start process/ecosystem.config.js
//   pm2 save   (persist across reboots)
//   pm2 startup (generate init script)

module.exports = {
  apps: [
    {
      name: "sooket",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Inherit ENCRYPTION_SECRET and SOOKET_DATA_DIR from the shell
        // environment or set them explicitly here:
        // ENCRYPTION_SECRET: "your-secret-here",
        // SOOKET_DATA_DIR: "/var/lib/sooket",
      },
    },
  ],
};

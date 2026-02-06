/**
 * PM2 ecosystem file – start backend and frontend with: pm2 start ecosystem.config.cjs
 * First time: build frontend once: cd frontend && npm run build
 */
module.exports = {
  apps: [
    {
      name: 'eda-backend',
      cwd: './backend',
      script: 'server.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'eda-frontend',
      cwd: './frontend',
      script: 'npx',
      args: ['serve', '-s', 'build', '-l', '3000'],
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
    },
  ],
};

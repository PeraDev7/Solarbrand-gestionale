module.exports = {
  apps: [{
    name: 'solarbrand',
    script: 'dist/server.cjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

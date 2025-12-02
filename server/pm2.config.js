module.exports = {
  apps: [
    {
      name: 'baylis-server',
      script: 'index.js',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

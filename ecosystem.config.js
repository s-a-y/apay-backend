module.exports = {
  apps : [{
    name: 'app',
    script: 'dist/main.js',

    args: '',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: ''
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'stellarmon',
    script: 'dist/stellar-monitor.js',

    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: ''
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'rates-fetcher',
    script: 'dist/rates-fetcher.js',

    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: ''
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
};

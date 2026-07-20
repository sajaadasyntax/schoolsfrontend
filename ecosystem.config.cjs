module.exports = {
  apps: [
    {
      name: "school-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4000",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : "fabdoc-console",
      script    : "server/index.js",
      env: {
        COMMON_VARIABLE: "true"
      },
      env_production : {
        NODE_ENV: "production"
      }
    },

    // Second application
    // {
    //   name      : "WEB",
    //   script    : "web.js"
    // }
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      user : "ubuntu",
      host : "52.77.119.251",
      ref  : "origin/master",
      repo : "https://github.com/FablabTaipei/FabDoc-console.git",
      path : "/home/ubuntu/project/fabdoc-console",
      "post-deploy" : "npm install && pm2 startOrRestart ecosystem.config.js --env production"
    },
    
  }
}

// Container for all the environments
let environments = {};

// Development (default)
environments.development = {
  httpPort: 3000,
  httpsPort: 3001,
  domain: 'localhost',
  envName: 'development',
  hashingSecret: 'my little secret',
  maxChecks: 5,
  twilio: {
    accountSid: 'your_account_sid',
    authToken: 'your_auth_token',
    fromPhone: 'your_phone'
  },
  templateGlobals: {
    appName: 'Uptime Checker',
    baseURL: 'http://localhost:3000',
    companyName: 'Home Inc.',
    yearCreated: 2021,
  }
};

// Production
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  domain: 'yourdomain',
  envName: 'production',
  hashingSecret: 'my little secret',
  maxChecks: 5,
  twilio: {
    accountSid: 'your_account_sid',
    authToken: 'your_auth_token',
    fromPhone: '+your_phone'
  },
  templateGlobals: {
    appName: 'Uptime Checker',
    baseURL: 'http://localhost:3000',
    companyName: 'Home Inc.',
    yearCreated: 2021,
  }
};


// Determine wich environment was passed as a command-line argument if any
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to development
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment]: environments.development;

module.exports = environmentToExport;
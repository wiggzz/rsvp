module.exports = {
  mailgunApiUrl: 'https://api.mailgun.net/v3',
  mailgunAccount: process.env.MAILGUN_DOMAIN,
  mailgunApiKey: process.env.MAILGUN_API_KEY,
  sendToEmail: process.env.EMAIL,
  accessControllAllowOrigin: process.env.ALLOW_ORIGINS,
  accessControllAllowMethods: process.env.ALLOW_METHODS
};

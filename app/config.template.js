module.exports = {
  mailgunApiUrl: 'https://api.mailgun.net/v3',
  mailgunAccount: process.env.MAILGUN_DOMAIN,
  mailgunApiKey: process.env.MAILGUN_API_KEY,
  sendFromEmail: process.env.FROM_EMAIL,
  sendToEmail: process.env.TO_EMAIL,
  accessControllAllowOrigins: process.env.ALLOW_ORIGINS,
  accessControllAllowMethods: process.env.ALLOW_METHODS,
  googleSheetsUser: process.env.GOOGLE_SHEETS_USER,
  googleSheetsKey: process.env.GOOGLE_SHEETS_KEY,
  googleSheetsSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  googleSheetsWorksheetId: process.env.GOOGLE_WORKSHEET_ID
};

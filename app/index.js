var fs = require('fs');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var express = require('express');
var Mustache = require('mustache');
var bodyParser = require('body-parser');
var validator = require('validator');
var Spreadsheet = require('edit-google-spreadsheet');
var config = require('./config').load();
var app = express();
app.use(bodyParser.urlencoded({extended: false}));

var readFile = Promise.promisify(fs.readFile);

function allowCrossDomain(req, res, next) {
  if (config.accessControllAllowOrigins) {
    var origin = config.accessControllAllowOrigins.split(',').reduce(function(acc, origin) {
      if (origin == "*" || acc == "*") {
        return "*"
      } else if (origin == req.get('Origin')) {
        return origin
      } else {
        return acc
      }
    },null);
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  if (config.accessControllAllowMethods) {
    res.header('Access-Control-Allow-Methods', config.accessControllAllowMethods);
  }

  next();
}
app.use(allowCrossDomain);

/*
  email: {
    from: 'Example <example@example.com>',
    to: 'Recipient <recipient@example.com>',
    subject: 'Example Subject',
    html: 'Example message body'
  }
*/
function sendEmail(email) {
  var url = config.mailgunApiUrl + '/' + config.mailgunAccount + '/messages';
  var password = config.mailgunApiKey;

  var options = {
    url: url,
    method: 'POST',
    auth: {
      user: 'api',
      pass: config.mailgunApiKey
    },
    formData: email
  };

  return request(options).spread(function (response, body) {
    if (response.statusCode != 200) {
      throw new Error('Invalid response from mailgun');
    }
  });
}

function writeRSVPToGoogleSheets(rsvp) {
  return new Promise(function(resolve, reject) {
    Spreadsheet.load({
      spreadsheetId: config.googleSheetsSpreadsheetId,
      worksheetId: config.googleSheetsWorksheetId,
      oauth: {
        email: config.googleSheetsUser,
        key: config.googleSheetsKey
      }
    }, function (err, spreadsheet) {
      if (err) {
        reject(err);
      }

      spreadsheet.receive(function(err, rows, info) {
        var appendRow = info.lastRow+1
        var obj = {}
        obj[appendRow] = {
          1: rsvp.name,
          2: rsvp.email,
          3: rsvp.coming ? 'Yes' : 'No',
          4: rsvp.message
        }
        spreadsheet.add(obj);

        spreadsheet.send({
          autoSize: true
        },function (err) {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    });
  });
}

/*
  rsvp: {
    name: 'Billy Bob Thornton',
    email: 'bbob@billybob.com',
    message: 'Yes, Im coming!!!',
    coming: false
  }
*/
function adaptRsvpObjectToEmail(rsvp) {
  return readFile('templates/email.mst',{encoding:'utf8'}).then(function(template) {
    var email = {
      from: config.sendFromEmail,
      to: config.sendToEmail,
      subject: 'Wedding RSVP from ' + rsvp.name,
      html: Mustache.render(template, rsvp)
    };
    return email;
  });
}

function adaptFormDataToRsvp(formData) {
  if (!formData.name) {
    throw new Error('Invalid RSVP parameter: Name');
  }

  if (formData.email) {
    if (!validator.isEmail(formData.email)) {
      throw new Error('Invalid RSVP parameter: Email');
    } else {
      formData.email = validator.normalizeEmail(formData.email);
    }
  }

  if (!formData.coming || !validator.isBoolean(formData.coming)) {
    throw new Error('Invalid RSVP parameter: coming');
  }

  return {
    name: formData.name,
    email: validator.normalizeEmail(formData.email),
    message: formData.message,
    coming: validator.toBoolean(formData.coming),
    sheetsUrl: 'https://docs.google.com/spreadsheets/d/' + config.googleSheetsSpreadsheetId
  };
}

app.post('/rsvp', function(req, res) {
  try {
    rsvp = adaptFormDataToRsvp(req.body);
  } catch (error) {
    console.log(error);
    res.status(400).json({error: error.message});
    return
  }
  Promise.join(
    writeRSVPToGoogleSheets(rsvp),
    adaptRsvpObjectToEmail(rsvp).then(sendEmail))
    .then(function() {
      res.sendStatus(200);
    }).catch(function(error) {
      console.log(error);
      res.sendStatus(500);
    });
});

var server = app.listen(process.env.PORT || 3000, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});

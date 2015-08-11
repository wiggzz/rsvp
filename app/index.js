var fs = require('fs');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var express = require('express');
var Mustache = require('mustache');
var bodyParser = require('body-parser');
var validator = require('validator');
var config = require('./config');
var app = express();
app.use(bodyParser.urlencoded({extended: false}));

var readFile = Promise.promisify(fs.readFile);

function allowCrossDomain(req, res, next) {
  if (config.accessControllAllowOrigin) {
    res.header('Access-Control-Allow-Origin', config.accessControllAllowOrigin);
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
      from: 'Wedding RSVP <rsvp@mg.willplusmichelle.com>',
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
    coming: validator.toBoolean(formData.coming)
  };
}

app.post('/rsvp', function(req, res) {
  try {
    rsvp = adaptFormDataToRsvp(req.body);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({error: error.message});
    return
  }
  adaptRsvpObjectToEmail(rsvp)
    .then(sendEmail)
    .then(function() {
      res.sendStatus(200);
    }).catch(function(error) {
      console.log(error.message);
      res.sendStatus(500);
    });
});

var server = app.listen(process.env.PORT || 3000, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});

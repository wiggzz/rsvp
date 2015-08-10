var fs = require('fs');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var express = require('express');
var Mustache = require('mustache');
var bodyParser = require('body-parser');
var validator = require('validator');
var config = require('./config');
var app = express();
app.use(bodyParser.json());

var readFile = Promise.promisify(fs.readFile);

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
      throw {
        message: 'Invalid response from mailgun',
        response: response
      };
    }
  });
}

/*
  rsvp: {
    name: 'Billy Bob Thornton',
    message: 'Yes, Im coming!!!',
    coming: false
  }
*/
function adaptRsvpObjectToEmail(rsvp) {
  return readFile('templates/email.mst',{encoding:'utf8'}).then(function(template) {
    var email = {
      from: 'Wedding RSVP <rsvp@mg.willplusmichelle.com>',
      to: 'jameswt@gmail.com',
      subject: 'Wedding RSVP from ' + rsvp.name,
      html: Mustache.render(template, rsvp)
    };
    return email;
  });
}

function adaptFormDataToRsvp(formData) {
  try {
    return Promise.resolve({
      name: formData.name,
      message: formData.message,
      coming: !!formData.coming
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

app.post('/rsvp', function(req, res) {
  adaptFormDataToRsvp(req.body)
    .then(adaptRsvpObjectToEmail)
    .then(sendEmail)
    .then(function() {
      res.sendStatus(200);
    }).catch(function(error) {
      res.status(500).json(error);
    });
});

var server = app.listen(process.env.PORT || 3000, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});

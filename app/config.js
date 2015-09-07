var fs = require('fs');
var crypto = require('crypto');

var algorithm = 'aes-256-cbc';
var encoding = 'base64';
var salt = 'soft circus suit frozen'

if (!process.env.CONFIG_KEY) {
  throw new Error('You must specify environment variable CONFIG_KEY');
}

var key = crypto.pbkdf2Sync(process.env.CONFIG_KEY, salt, 4096, 32, 'sha256');

function encrypt(string) {
  var iv = crypto.randomBytes(16);

  var cipher = crypto.createCipheriv(algorithm, key, iv);

  var data = cipher.update(string, 'utf8', encoding) + cipher.final(encoding);

  return {
    iv: iv.toString(encoding),
    data: data
  }
}

function decrypt(object) {
  var iv = new Buffer(object.iv, encoding);

  var decipher = crypto.createDecipheriv(algorithm, key, iv);

  return decipher.update(object.data, encoding, 'utf8') + decipher.final('utf8');
}

function compile() {
  var plaintextConfig = fs.readFileSync('_config.js');

  fs.writeFileSync('app/_config.js', JSON.stringify(encrypt(plaintextConfig)));
}

function load() {
  var encryptedConfig = JSON.parse(fs.readFileSync('./app/_config.js'));

  var decryptedConfig = decrypt(encryptedConfig);
  var m = new module.constructor();
  m._compile(decryptedConfig);
  return m.exports;
}

module.exports = {
  compile: compile,
  load: load
};

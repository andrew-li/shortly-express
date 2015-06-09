var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  defaults: {
    username: ''
  },

  initialize: function(obj){
    this.on('creating', function(model, attr, options){

      var salt = bcrypt.genSaltSync(10);
      model.set('username', obj.username);
      model.set('salt', salt);

      var hash = bcrypt.hashSync(obj.password, salt);
      model.set('password', hash);

    })
  },

  checkHash: function(inputpw){
    var salt = this.get('salt');
    var storedHash = this.get('password');

    var checkPwHash = bcrypt.hashSync(inputpw, salt);
    if (checkPwHash === storedHash){
      return true;
    } else {
      return false;
    }
  }

});


/*
var Link = db.Model.extend({
  tableName: 'urls',
  hasTimestamps: true,
  defaults: {
    visits: 0
  },
  clicks: function() {
    return this.hasMany(Click);
  },
  initialize: function(){
    this.on('creating', function(model, attrs, options){
      var shasum = crypto.createHash('sha1');
      shasum.update(model.get('url'));
      model.set('code', shasum.digest('hex').slice(0, 5));
    });
  }
});
*/
module.exports = User;

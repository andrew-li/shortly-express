var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require ('cookieparser')

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

//app.use(bodyParser);
//app.use(cookieParser('shhhh, very secret'));
app.use(session({secret: '<mysecret>',
                 saveUninitialized: true,
                 resave: true}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/',
function(req, res, next) {
  //if user not logged in, then redirect to login
  if (req.session.user) {
     res.render('index');
     //next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }

});

app.get('/login', function(req, res){
  res.render('login');

})

app.get('/create',
function(req, res, next) {
  if (req.session.user) {
     next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }

  res.render('index');
});

app.get('/links',
function(req, res, next) {

  // if (req.session.user) {
  //    next();
  // } else {
  //   req.session.error = 'Access denied!';
  //   res.redirect('/login');
  // }


  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });


});

app.post('/links',
function(req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin,
        });

        db.knex('urls_users').insert({uid: 10, url_id: 'xyz'})

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

app.get('/signup',
function(req, res, next) {
  res.render('signup');
});

app.post('/signup',
function(req, res, next) {

  // console.log("Req.body is, ", req.body.username)
  // 1. Check&Create in Database user name and pw
  // need to prevent user from registering if already in database

  Users.reset().fetch().then(function(users){
    var found = false;

    for (var i = 0; i < users.models.length; i++){
      if (users.models[i].get('username') === req.body.username ) found = true;
    }

    if (!found){
      var user = new User ({ username: req.body.username, password: req.body.password})
      user.save();

      req.session.regenerate(function(){
        req.session.user = req.body.username;
        res.redirect('/');
      });
    }
    else
    {
      res.render('signup');
    }
  })


  // TABLE:
  // USER: UID, username/password
  // URLS: link_id, URLs, 1 UID, clicks
  // CLICKS: CID, REF link_ID,

  // 2. Log user in
  // 3. Redirect to Index page
  // 4. Query for USER links
  //
  // Need: Logout button

  //res.render('signup');

});

app.post('/login',
function(req, res, next) {

  // Find user in user table.
  // Find salt
  // hash with password
  // Compare password to hash
  // Then assign session to username
  // Route to index page.

  Users.reset().fetch().then(function(users){

    var found = false;
    for (var i = 0; i < users.models.length; i++){
      if (users.models[i].get('username') === req.body.username ) {
        if ( users.models[i].checkHash(req.body.password) ){
          found = true;
          break;
        }
      }
    }

    if(found){
      req.session.regenerate(function(){
        req.session.user = req.body.username;
        res.redirect('/');
      });
    } else {
      res.render('login');
    }

  });

});




/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

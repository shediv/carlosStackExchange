/**
 * Module Dependencies.
 */
var express = require('express'),
    passport = require('passport'),
    StackExchangeStrategy = require('./lib').Strategy,
    morgan = require('morgan'), // logger
    session = require('express-session'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser');
const request = require('request-promise');
const zlib = require('zlib');


/**
 * Configurations.
 */
var STACK_EXCHANGE_APP_ID = '13021', // '*** YOUR APP ID (CLIENT ID) ***',
    STACK_EXCHANGE_APP_SECRET = 'MJY3DZowYEiuKYFJ4HJePA((', //'*** YOUR APP SECRET (CLIENT SECRET) ***',
    STACK_EXCHANGE_APP_KEY = 'gUtsEyt6yj5O)MX*)Xs1Gw((';


/**
 * Passport session setup
 */
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});



/**
 * Use the StackExchangeStrategy within Passport
 */
passport.use(new StackExchangeStrategy({
        clientID: STACK_EXCHANGE_APP_ID,
        clientSecret: STACK_EXCHANGE_APP_SECRET,
        callbackURL: 'http://localhost:3000/auth/stack-exchange/callback',
        stackAppsKey: STACK_EXCHANGE_APP_KEY,
        site: 'stackoverflow'
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            // To keep the example simple, the user's Facebook profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Facebook account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));



/**
 * Configure Express
 */
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(morgan());
app.use(cookieParser());
app.use(bodyParser());
app.use(session({secret: 'keyboard cat'}));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res){
    res.render('index', { user: req.user });
});

app.post('/account', ensureAuthenticated, function(req, res){
    //res.render('account', { user: req.user });
    var user = req.user;
    var requestOptions,
        requestCall,
        wiki,
        buffer,
        gunzip;

    requestOptions = {
        url: 'http://api.stackexchange.com/2.2/users/'+req.user.id+'?order=desc&sort=reputation&site=stackoverflow'
    };
    requestCall = request(requestOptions);

    requestCall.on('response', function (wikiRequest) {
        if (wikiRequest.statusCode === 200) {
            buffer = [];
            gunzip = zlib.createGunzip();
            wikiRequest.pipe(gunzip);
            gunzip.on('data', function (data) {
                // decompression chunk ready, add it to the buffer
                buffer.push(data.toString());
            }).on("end", function () {
                // response and decompression complete, join the buffer and return
                wiki = JSON.parse(buffer.join(''));
                //console.log(" wiki = ", wiki);
                req.user.details = wiki.items[0];
                req.user.email = req.body.email;
                return res.render('account', { user: req.user });
            })
        }
    })

});

app.post('/account2', function(req, res){
    console.log("fname =", req.body.fname);



    //Working .....................
    // var requestOptions = {
    //     url: 'https://api.stackexchange.com/2.2/users/4777609?order=desc&sort=reputation&site=stackoverflow'
    // };
    //
    // var req = request(requestOptions);
    //
    // req.on('response', function (wikiRequest) {
    //     var wiki;
    //     var buffer;
    //     var gunzip;
    //
    //     if (wikiRequest.statusCode === 200) {
    //         buffer = [];
    //         gunzip = zlib.createGunzip();
    //
    //         wikiRequest.pipe(gunzip);
    //
    //         gunzip.on('data', function (data) {
    //             // decompression chunk ready, add it to the buffer
    //             buffer.push(data.toString());
    //
    //         }).on("end", function () {
    //             // response and decompression complete, join the buffer and return
    //             wiki = JSON.parse(buffer.join(''));
    //             console.log(" wiki = ", wiki);
    //         })
    //     }
    // })




});

app.get('/login', function(req, res){
    res.render('login', { user: req.user });
});

app.get('/auth/stack-exchange',
    passport.authenticate('stack-exchange'));

app.get('/auth/stack-exchange/callback',
    passport.authenticate('stack-exchange', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.listen(3000);



function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}
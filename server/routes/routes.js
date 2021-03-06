const router = require('express').Router();
const passport = require('passport');
const request = require('request');
const authenticate = require('./authenticate.js');
const createPost = require('./createPost.js');
const twitter = require('../../utility/passport/twitter');
const { retrieveTokens } = require('../../database/index');
const util = require('../../utility/index');
const watson = require('./watsonRoutes')
var PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

passport.use(twitter.strat);
router.use('/createpost', createPost);
router.use('/', authenticate);
router.use('/watson',watson)

const getUserTokens = (req, res, next) => {
  let userId = req.params.userId;
  let oauth = twitter.oauth;

  retrieveTokens(userId, (err, results) => {
    if (err) {
      console.log('Database/Server Error on retrieveTokens: ', err);
      next();
    } else {
      oauth.token = results && results.rows ? results.rows[0].twitter_token : null; 
      oauth.token_secret = results && results.rows ? results.rows[0].twitter_token_secret : null;
      req.oauth = oauth;
      next();
    }
  });
}

const getUserTweets = (oauth, screenName, callback) => {
  request.get({url:`https://api.twitter.com/1.1/statuses/user_timeline.json?${screenName ? 'screen_name=' + screenName : ''}&tweet_mode=extended&count=200&include_rts=0`, oauth: oauth}, (err, response, body) => {
    if (JSON.parse(body).errors) {
      callback(JSON.parse(body).errors);
    } else {
      callback(null, JSON.parse(body));
    }
  });
}

const getUserPersonality = (text,callback) => {
  var personalityInsights = new PersonalityInsightsV3({
    username: '264dd11f-9485-4a1d-a4d2-10389711df8f',
    password: process.env.WATSON_PASSWORD,
    version: '2017-10-13',
    url: 'https://gateway.watsonplatform.net/personality-insights/api/v3/profile?version=2017-10-13'
  });
  personalityInsights.profile(
    {
      content: text,
      content_type: 'text/plain',
      consumption_preferences: true
    },
    function(err, response) {
      if (err) {
        console.log('error:', err);
        callback(err)
      } else {
        callback(null,JSON.stringify(response,null,2))
      }
    }
  );
}

const getUserTone = (text,callback) => { 
  var toneAnalyzer = new ToneAnalyzerV3({
    username: 'c2ef87b2-7083-4955-8520-b5576740100c',
    password: 'qCXrdHEQEzjp',
    version: '2017-09-21',
    url: 'https://gateway.watsonplatform.net/tone-analyzer/api/'
  });
  toneAnalyzer.tone(
    {
      tone_input: text,
      content_type: 'text/plain'
    },
    function(err, tone) {
      if (err) {
        console.log(err);
        callback(err)
      } else {
        callback(null,JSON.stringify(tone, null, 2))
      }
    }
  );
}
  

router.use('/home/updateTwitterFeed/:userId', getUserTokens);
router.use('/users/:userId/feed', getUserTokens);
router.use('/users/:userId/getUserToneAndPersonality',getUserTokens);

router.get('/', (req, res) => {
  res.status(200).json({message: 'connected / GET'});
});

router.get('/home', (req, res) => {
  res.status(200).json({message: 'connected /api/home GET'});
});

router.get('/home/updateTwitterFeed/:userId', (req, res) => {
  const {screenName} = req.query;
  request.get({url:`https://api.twitter.com/1.1/statuses/user_timeline.json?${screenName ? 'screen_name=' + screenName : ''}&count=200&tweet_mode=extended&include_rts=0`, oauth: req.oauth}, (err, response, body) => {
    if (JSON.parse(body).errors) {
      res.status(500).send(JSON.parse(body).errors[0].message);
    } else {
      res.send(JSON.parse(body)).status(200);
    }
  });
});

router.get('/users/:userID/getUserToneAndPersonality', (req,res) => {
  let result = {}
  getUserTweets(req.oauth, req.query.screenName, (err, body) => {  
    if (err) {
      res.status(500).send(err[0].message);
    } else {
      let tweets = body.map(tweet => tweet.full_text);
      let tweetText = tweets.join('')
      getUserTone(tweetText, (err, body) => {
        if (err) {
          console.log('error',err)
          res.status(err.code).send(err.error)
        } else {
          result.tone = JSON.parse(body);
          getUserPersonality(tweetText,(err,body) => {
            if (err) {
              console.log('error',err)
              res.status(err.code).send(err.error)
            } else {
              result.personality = JSON.parse(body);
              res.send(result);    
            }
          })
        }
      });
    }
  })
})

router.post ('/getTweetTone', jsonParser, (req, res)=>{
  let tweet = req.body.tweet;
  getUserTone(tweet, (err, body) => {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.send(body);
    }
  })
})

router.get('/users/:userId/feed', (req, res) => {
  request.get({url:`https://api.twitter.com/1.1/statuses/home_timeline.json?tweet_mode=extended&count=100&include_rts=0`, oauth: req.oauth}, (err, response, body) => {
    res.send(JSON.parse(body)).status(200);
  });
});

router.get('/drafts', (req, res) => {
  res.status(200).json({message: 'connected /api/drafts GET'});
});

module.exports = router;

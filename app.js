//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash")
const moment = require("moment")
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://localhost:27017/todolistDB",{useNewUrlParser: true, useUnifiedTopology: true})
mongoose.connect("mongodb+srv://test123:test123@cluster0.rrwwt.mongodb.net/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.set("useCreateIndex", true)

const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: String
})

const Item = mongoose.model("Item", itemsSchema)

const listSchema = {
  name: String, 
  username: String,
  items: [itemsSchema]
}

const List = mongoose.model("List", listSchema)

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true }, 
  email: String,
  password: String,
  provider: String,
  name: String
})

var profileLocality = "local"
var currentProfile
var currUsername

userSchema.plugin(passportLocalMongoose,{
  usernameField: "username"
})
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy())

passport.serializeUser(function(user, done) {
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
 User.findById(id, function(err, user) {
    done(err, user);
  });
});



const day = moment().format("dddd, MMMM Do")

////////////////////////// google strat //////////////////////////////////////

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://stormy-gorge-10384.herokuapp.com/auth/google/todolist",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    profileLocality = "google"
    currentProfile = profile
    currUsername = currentProfile.id

    User.findOrCreate({ username: profile.id },        
      {
        provider: "google",
        email: profile._json.email,
        name: profile.displayName
      }, 
      function (err, user) {
        return cb(err, user)
    });
  }
));

////////////////////////// facebook strat //////////////////////////////////////

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://stormy-gorge-10384.herokuapp.com//auth/facebook/todolist"
  },
  function(accessToken, refreshToken, profile, cb) {
    profileLocality = "facebook"
    currentProfile = profile
    currUsername = currentProfile.id
    User.findOrCreate({ username: profile.id },
      {
        provider: "facebook",
        email: profile._json.email,
        name: profile.displayName
      }, 
      function (err, user) {
        return cb(err, user);
    });
  }
));

////////////////////////// auth routes //////////////////////////////////////


app.get("/auth/google",
  passport.authenticate("google", {scope: ["profile", "email"]}))

app.get("/auth/google/todolist",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/today");
  });

app.get('/auth/facebook',
  passport.authenticate('facebook', {scope: ["email"]}));

app.get('/auth/facebook/todolist',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/today');
  });

////////////////// main routes //////////////////////////////////

app.get("/", function(req, res){
  res.render("home")
})

app.route("/login")
  .get(function(req, res){
    res.render("login")
  })
  .post(function(req, res){
    const user = new User({
        username: req.body.username,
        email: req.body.username,
        password: req.body.password
    })
    req.login(user, function(err){
      if (err) {
          console.log(err)
      } else {
        currentProfile = user
        currUsername = currentProfile.username
        console.log(currUsername)
        passport.authenticate("local")(req, res, function(err){
          if (err) {
            console.log(err)
          }  else {
            res.redirect("/today")
          }
        })
      }
    })
  })

app.get("/logout", function(req, res){
  req.logout()
  res.redirect("/")
})

app.route("/register")
  .get(function(req, res){
    res.render("register")
  })
  .post(function(req, res){
    const username = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    User.register({username: username, email: username, name: name, provider: "local"}, password, function(err, user){
      
      if (err) {
          console.log(err)
          res.redirect("/register")
      } else {
        currentProfile = user
        currUsername = currentProfile.email
        console.log(currentProfile)
        res.redirect('/today')
        // passport.authenticate('local')(req, res, function(err) {
        //   if (err){
        //     console.log(err)
        //   } else {
        //     User.updateOne(
        //       { _id: user._id },
        //       { $set: { provider: "local", email: username, name: name } },
        //       () => res.redirect('/today')
        //     )
        //   }
        // })
      }
    })
  })

app.route("/today") 
  .get(function(req, res) {
    console.log(currUsername)
    User.find({username: currUsername}, function(err, currUser){
      List.find({username: currUsername}, function(err, otherLists){
        Item.find({username: currUsername}, function(err, results){
            res.render("list", {listTitle: day, newListItems: results, otherLists: otherLists, currUser: currUser[0] });
        })
      })
    })
    
    
  })
  .post(function(req, res) {
    const listName = req.body.list
    const itemName = req.body.newItem
    const item = new Item({
      name: itemName,
      username: currUsername
    })

    if (listName === day) {
      item.save()
      res.redirect("/today")
    } else {
      List.findOne({username: currUsername, name: listName}, function(err, foundList){
        foundList.items.push(item)
        foundList.save()
        res.redirect("/" + listName)
      })
    }
  });

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName) 

  User.find({username: currUsername}, function(err, currUser){
    List.find({username: currUsername}, function(err, otherLists){
      List.findOne({username: currUsername, name: customListName}, function(err, foundList){
        if (!err) {
          if (!foundList) {
            //create a new list
            const list = new List({
              name: customListName,
              username: currUsername
            })
            list.save();
            res.redirect("/" + customListName)
          } else {
            //show an existing list
            res.render("list", {listTitle: foundList.name, newListItems: foundList.items, otherLists: otherLists, currUser: currUser[0]})
          }
        } 
      })
    })
  })
  
})

app.post("/newList", function(req, res){
  const newListTitle = req.body.newListTitle

  res.redirect("/" + newListTitle)
})

app.post("/delete", function(req, res){
  
  const id = req.body.checkbox
  const listName = req.body.listName

  if (listName === day) {
    Item.findByIdAndRemove(id, function(err){
      if (err) {
        console.log(err)
      } else {
        console.log("successfully removed")
      }
    })
    res.redirect("/today")
  } else {
    List.findOneAndUpdate({username: currUsername, name: listName}, {$pull: {items: {_id: id}}}, function(err, foundList){
      if (!err) {
        res.redirect("/" + listName)
      }
    })
  }
});

app.post("/deleteList", function(req, res){
  
  const listID = req.body.listID

  List.findOneAndRemove({username: currUsername, _id: listID}, function(err){
    if (err){
      console.log(err)
    } else {
      console.log("successfully removed list")
      res.redirect("/today")
    }
  })  
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});

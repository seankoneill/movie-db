const express = require("express");
const session = require("express-session");
const mongoose = require('mongoose');
const bodyParser = require("body-parser");

const User = require("./models/UserModel");
const Review = require("./models/ReviewModel");

const app = express();
mongoose.connect('mongodb://localhost/moviedb', {useNewUrlParser: true});

app.set("view engine", "pug");
app.use(session({secret: 'some secret', cookie: {maxAge: 1000000}}));
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static("views"));
app.get("/login", (req,res) => { res.status(200).render("login"); });
app.post("/login", login, signup);

app.use(auth);

app.get("/", (req,res) => { res.status(200).render("index"); });
app.get("/contribute", (req,res) => { res.status(200).render("contribute"); });
app.get("/logout", logout);
app.get("/profile", profile);

app.use(putCheck);
let movieRouter = require("./routers/movie-router");
app.use("/movies", movieRouter);
let userRouter = require("./routers/user-router");
app.use("/users", userRouter);
let personRouter = require("./routers/person-router");
app.use("/people", personRouter);
let reviewRouter = require("./routers/review-router");
app.use("/reviews", reviewRouter);

app.use("/",sendResults);

app.use("/", (req,res) => { res.status(404).send("ERROR 404: Resourse does not exist."); });

function sendResults(req,res,next) {
  res.format({
    "text/html": () => {res.status(200).render("results", {
      results: res.results,
      page: req.query.page
    });},
    "application/json": () => {res.status(200).json(res.results)}});
}

function putCheck(req,res,next) {
  if (req.body.put)
    req.method = "PUT";
  next();
}

function auth(req,res,next) {
  User.findOne({session: req.session.id}).exec((err,user) => {
    if (err) next(err);
    if (!user)
      res.status(401).redirect("/login");
    else {
      req.user = user;
      next();
    }
  });
} 

function login(req,res,next) {
  console.log(req.body);
  if (req.body.signup)
    next();
  else {
    User.findOne({
      username: req.body.username,
      password: req.body.password})
      .exec((err, user) => {
        if (err) next(err);
        if (user) {
          if (user.session == req.session.id) res.status(401).redirect("/users/"+user._id);
          else {
            User.findOne({session: req.session.id}).exec((err,u) => {
              if (err) next(err);
              if (u) res.status(403).send("Already logged in as different user.");
              else {
                user.session = req.session.id; 
                user.save((err) => {
                  res.status(200).redirect("/users/"+user._id);
                });
              }});
          }
        } else res.status(404).send("Invalid username or password");
      });
  }
}

function signup(req,res,next) {
  User.findOne({username: req.body.username}).exec((err,user) => {
    if (err) next(err);
    if (!user) {
      let u = new User({
        username: req.body.username,
        password: req.body.password,
        session: req.session.id,
        joined: new Date(Date.now)
      });
      u.save((err) => {
        if (err) next(err);
        else res.status(201).redirect("/users/"+u._id);
      });
    } else res.status(403).send("Username already in use.");
  });
}

function logout(req, res) {
  User.findOneAndUpdate(
    {
      session: req.session.id
    })
    .exec((err,user) => {
      if (err) next(err);
      if (user) {
        req.session.destroy((err) => {
          user.session = "";
          user.save();
          res.status(201).redirect("/login");
        });
      }
      else res.status(403).redirect("/login");
    });
}

function profile(req, res) {
  User.findOne({session: req.session.id}).exec((err,user) => {
    if (err) next(err);
    if (user) res.status(200).redirect("/users/"+user._id);
    else res.status(401).redirect("/login");
  });
}

app.listen(3000);
console.log("Server listening at http://localhost:3000");

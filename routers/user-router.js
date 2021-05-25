const express = require("express");
const User = require("../models/UserModel");
const Movie = require("../models/MovieModel");
const Person = require("../models/PersonModel");

let router = express.Router();

router.use("/:uId", getUser);
router.use("/:uId", getReviews);
router.get("/:uId/", ownPage);

router.get("/:uId", getRecommended, sendUser);
router.get("/:uId/reviews", getReviews, sendReviews);
router.get("/", getUsers);

router.use("/:uId/", auth);

router.post("/:uId/followedPeople", (req,res,next) => addIdToUser(req,res,next,Person,"followedPeople"), directToCurrent);
router.post("/:uId/followedUsers", (req,res,next) => addIdToUser(req,res,next,User,"followedUsers"), directToCurrent);
router.post("/:uId/watchedMovies", (req,res,next) => addIdToUser(req,res,next,Movie,"watchedMovies"), directToCurrent);

router.put("/:uId/contributor", toggleContibutor, directToCurrent);
router.put("/:uId/followedPeople", (req,res,next) => removeIdFromUser(req,res,next,"followedPeople"), directToCurrent);
router.put("/:uId/followedUsers", (req,res,next) => removeIdFromUser(req,res,next,"followedUsers"), directToCurrent);
router.put("/:uId/watchedMovies", (req,res,next) => removeIdFromUser(req,res,next,"watchedMovies"), directToCurrent);

router.put("/:uId/personNotifs", (req,res,next) => removeNotif(req,res,next,"personNotifs"), directToCurrent);
router.put("/:uId/userNotifs", (req,res,next) => removeNotif(req,res,next,"userNotifs"), directToCurrent);

function getReviews(req,res,next) {
  User.findById(req.params.uId)
  .populate('reviews')
    .exec((err,user) => {
    if (err) next(err);
    if (!user) res.status(404).send("No users that matched the query"); 
    else {
      res.results = { links: [], path: 'reviews' };
      user.reviews.forEach(r => {
        res.results.links.push({id: r._id, text: r.title});
      });
      next();
    }
  });
}

function sendReviews(req,res) {
  res.format({
    "text/html": () => {res.status(200).render("results", {
      results: res.results,
      page: req.query.page
    });},
    "application/json": () => {res.status(200).json(res.results)}});
}

function removeNotif(req,res,next,field) {
  req.user[field] = req.user[field].splice(req.body.index,1);
  req.user.save((err) => {
    if (err) next(err);
    next();
  });
}

function toggleContibutor(req,res,next) {
  req.user.contributor = !req.user.contributor;
  req.user.save((err) => {
    if (err) next(err);
    next();
  });
}

function addUser(req,res,next) {
  User.find({username: req.body.username})
    .exec((err,user) => {
    if (err) res.status(500).send("Internal server error.").end();
    if (user) res.status(403).send("Username already in use.");
    let u = new User({
      username: req.body.username,
      password: req.body.password,
      session: req.session.id,
      joined: new Date(Date.now()).toLocaleDateString('en-GB')
    });
    u.save((err) => {
      if (err) next(err);
      next();
    });
  });
}

function getUsers(req,res,next) {
  User.find({username: {$regex: req.query.username, $options: 'i'}})
    .exec((err,users) => {
    if (err) 
      res.status(500).send("Internal server error.");
    else if (!users)
      res.status(404).send("No users that matched the query"); 
    else {
      res.results = { links: [], path: 'users' };
      users.forEach(user => {
        res.results.links.push({id: user._id, text: user.username});
      });
      next();
    }
  });
}

function sendUsers(req,res) {
  res.format({
    "text/html": () => {res.status(200).render("results", {
      results: res.results,
      page: req.query.page
    });},
    "application/json": () => {res.status(200).json(res.movies)}});
}

function getRecommended(req,res,next) {
  Movie.find({actors: {$in: req.user.followedPeople}}).exec((err,movies) => {
    if (err) next(err);
    if (movies) 
      res.user.recommended = movies;
    next();
  });
}

function getUser(req,res,next) {
  User.findById(req.params.uId)
    .populate('followedUsers')
    .populate('followedPeople')
    .populate('watchedMovies')
    .populate('reviews')
    .populate('peopleNotifs')
    .populate('userNotifs').exec((err,u) => {
      if (err) next(err);
      if (!u) res.status(404).send(`ERROR 404: Could not find user. User ID: ${req.params.uId}`);
      else {
        res.user = u; 
        next();
      }
    });
}

function sendUser(req,res) {
  console.log(res.user);
  res.format({
    "text/html": () => {res.status(200).render("user", {
      user: res.user,
      currentUser: req.user._id
    });},
    "application/json": () => {res.status(200).json(res.user)}});
}

function directToCurrent(req, res) {
  res.status(201).redirect("/users/"+req.user._id);
}

function ownPage(req,res,next) {
  res.user.ownPage = req.user._id == req.params.uId;
  next();
}

function auth(req,res,next) {
  if (req.user._id != req.params.uId) res.status(401).send("Users can only make changes to their own accounts");
  else next();
}

function addIdToUser(req,res,next,model,field) {
  model.findById(req.body.addId).exec((err,m) => {
    if (err) next(err);
    if (!m) res.status(404).send(`ERROR 404: Id ${req.body.addId} does not exist`);
    else if (!req.user[field].includes(req.body.addId))
      req.user[field].push(req.body.addId);
    req.user.save(next);
  });
}

function removeIdFromUser(req,res,next,field) {
  req.user[field] = req.user[field].filter(id => id != req.body.removeId);
  req.user.save(next);
}

module.exports = router;

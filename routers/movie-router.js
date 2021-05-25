const express = require("express");
const Movie = require('../models/MovieModel');
const Person = require('../models/PersonModel');
const User = require('../models/UserModel');
const Review = require('../models/ReviewModel');

let router = express.Router();
const PAGE_LIMIT = 10;

router.get("/", getMovies);
router.use("/:mId", getMovie);
router.get("/:mId", getReviews, getSimilar, sendMovie);

router.post("/", isContributor);
router.post("/", addMovie, 
  (req,res,next) => { getPeopleIds(req,res,next,"actors","acted") }, 
  (req,res,next) => { getPeopleIds(req,res,next,"writers","wrote") }, 
  (req,res,next) => { getPeopleIds(req,res,next,"directors","directed") }, 
  saveMovie);

function addReview(req,res,next) {
  Movie.findById(req.body.movieId).exec((err,movie) => {
    if (err) res.status(500).send("Internal server error.").end();
    if (!movie) res.status(404).send("Movie does not exist").end();
    let r = new Review({
      movie: movie._id,
      score: req.body.score,
      summary: req.body.summary,
      fulltext: req.body.fulltext});
    r.save(next);
  });
}

function getReviews(req,res,next) {
  Review.findOne()
    .exec((err,reviews) => {
      if (err) next(err);
      if (reviews) 
        req.movie.reviews = reviews;  
      next();
    });
}

function isContributor(req,res,next) {
  if (!req.user.contributor) res.status(401).send("You must be a contributor to add a movie");
  else next();
}

function getSimilar(req,res,next) {
  Movie.find({$and: 
    [
      {genres: {$all: req.movie.genres}}, 
      {_id: {$ne: req.movie._id}}
    ]})
    .limit(15)
    .exec((err,movies) => {
      if (err) next(err);
      req.movie.similar = movies;
      next();
    });
}

async function notify(people,movie) {
  people.forEach(person => {
    Person.findById(person).exec((err,p) => {
      if (err) next(err);
      User.aggregate([
        {
          $lookup: 
          {
            from: 'people', 
            localField: 'followedPeople', 
            foreignField: '_id', 
            as: 'peopleDocs'}},
        {
          $match: 
          {
            peopleDocs: {$elemMatch: {name: {$regex: p.name, $options: 'i'}}}}}])
        .exec((err,users) => {
          if (err) next(err);
          if (users) {
            users.forEach(user => {
              User.findById(user._id).exec((err,u) => {
                u.peopleNotifs.push({
                  source: p._id,
                  link: movie._id,
                  sourceName: p.name,
                  linkName: movie.title
                });
                u.save();
              });
            });
          }
        });
    });
  });
}

function saveMovie(req,res) {
  res.movie.save((err) => {
    if (err) next(err);
    else res.status(201).redirect("/movies/"+res.movie._id);
  });
}

function addMovie(req,res,next) {
  Movie.findOne({title: req.body.title}).exec((err,m) => {
    if (err) next(err);
    if (m) res.status(200).send(`Movie ${req.body.title} already exists`);
    else {
      res.movie = new Movie({
        title: req.body.title,
        date: req.body.date,
        runtime: req.body.runtime,
        genres: req.body.genres.split(","),
        plot: req.body.plot
      });
      next();
    }
  });
}

function getPeopleIds(req,res,next,movieField,personField) {
  let peopleIds = new Set();
  let numPeople = 0;
  let names = req.body[movieField].split(",");
  names.forEach(n => {
    numPeople++;
    Person.findOne({name: n}).exec((err,person) => {
      if (err) next(err);
      else if (person)
        peopleIds.add(person._id);
      else {
        person = new Person({
          name: n,
        });
        person[personField] = [];
      }
      person[personField].push(res.movie._id);
      person.save((err) => {
        if (err) next(err);
        peopleIds.add(person._id);
      });
      if (numPeople == names.length) {
        res.movie[movieField] = Array.from(peopleIds);
        notify(Array.from(peopleIds),res.movie);
        next();
      }
    });
  });
}

function getMovie(req,res,next) {
  Movie.findById(req.params.mId)
    .exec((err,movie) => {
      if (err) 
        res.status(500).send("Internal server error.").end();
      else if (!movie)
        res.status(404).send(`ERROR 404: Could not find movie. Movie ID: ${req.params.mId}`);
      else {
        req.movie = movie; 
        next();
      }
    });
}

function sendMovie(req,res) {
  Movie.findById(req.movie._id)
    .populate('actors')
    .populate('writers')
    .populate('directors')
    .populate('directors')
    .exec((err,movie) => {
      movie.similar = req.movie.similar;
      if (err) 
        res.status(500).send("Internal server error.").end();
      res.movie = movie; 
      res.format({
        "text/html": () => {res.status(200).render("movie", { 
          movie: res.movie,
          currentUser: req.user._id
        });},
        "application/json": () => {res.status(200).json(res.movie)}});
    });
}

function getMovies(req,res,next) {
  if (!req.query.page)
    req.query.page = 0;
  if (!req.query.title)
    req.query.title = "";
  if (!req.query.actor)
    req.query.actor = "";
  if (!req.query.genre)
    req.query.genre = "";
  Movie.aggregate([
    {
      $lookup: 
      {
        from: 'people', 
        localField: 'actors', 
        foreignField: '_id', 
        as: 'actorDocs'}},
    {
      $match: 
      {
        title: {$regex: req.query.title, $options: 'i'},
        genres: {$regex: req.query.genre, $options: 'i'},
        actorDocs: {$elemMatch: {name: {$regex: req.query.actor, $options: 'i'}}}}},
    {
      $skip: req.query.page*PAGE_LIMIT},
    {
      $limit: PAGE_LIMIT}])
    .exec((err,movies) => {
      if (err) 
        res.status(500).send("Internal server error.");
      else if (!movies)
        res.status(404).send("No movies that matched the query"); 
      else {
        res.results = { links: [], path: 'movies' };
        movies.forEach(movie => {
          res.results.links.push({id: movie._id, text: movie.title});
        });
        next();
      }
    });
}

function sendMovies(req, res) {
  let prevPage = req.query.page == 0 ? 0 : Number(req.query.page) - 1;
  let nextPage = Number(req.query.page) + 1;
  let q = "movies?title="+req.query.title+"&actor="+req.query.actor+"&genre="+req.query.genre;
  let next = q + "&page=" + nextPage;
  let prev = q + "&page=" + prevPage;
  res.format({
    "text/html": () => {res.status(200).render("results", {
      results: res.results,
      nextString: next,
      prevString: prev
    });},
    "application/json": () => {res.status(200).json(res.movies)}});
}

module.exports = router;

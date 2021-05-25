const express = require("express");
const Review = require('../models/ReviewModel');
const User = require('../models/UserModel');

let router = express.Router();

router.get("/:rId", getReview, getUser, sendReview);
router.post("/", addReview, addToUser);

function getUser(req,res,next) {
  User.findOne({reviews: res.review._id})
    .exec((err,user) => {
      if (err) next(err);
      if (user) {
        res.review.user = {username: user.username, _id: user._id};
        next();
      }
    });
}

function addReview(req,res,next) {
  let r = new Review({
    movie: req.body.movieId,
    user: req.user._id,
    score: req.body.score,
    summary: req.body.summary,
    fulltext: req.body.fulltext});
  res.review = r;
  r.save((err) => {
    if (err) next(err);
    next();
  });
}

function addToUser(req,res,next) {
  req.user.reviews.push(res.review._id);
  req.user.save((err) => {
    if (err) next(err);
    res.status(201).redirect("reviews/"+res.review._id);
  });
}

function getReview(req,res,next) {
  Review.findById(req.params.rId)
    .populate('movie')
    .populate('user')
    .exec((err,review) => {
      if (err) next(err);
      if (!review) res.status(404).send("ERROR 404: Review not found");
      else {
        res.review = review;
        next();
      }
    });
}

function sendReview(req, res, next) {
  res.format({
    "text/html": () => {res.status(200).render("review", {review: res.review});},
    "application/json": () => {res.status(200).json(res.review)}});
}

module.exports = router;

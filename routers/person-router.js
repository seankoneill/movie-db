const express = require("express");
const Person = require('../models/PersonModel');

let router = express.Router();

router.get("/:pId", getPerson, sendPerson);
router.get("/", getPeople);
router.post("/", addPerson, sendPerson);

function getPeople(req,res,next) {
  if (!req.query.page)
    req.query.page = 0;
  Person.find({name: {$regex: req.query.name, $options: 'i'}})
    .skip(10*req.query.page)
    .limit(10)
    .exec((err,people) => {
      if (err) next(err);
      if (!people) res.status(404).send("No people that matched the query"); 
      else {
        res.results = { links: [], path: 'people' };
        people.forEach(person => {
          res.results.links.push({id: person._id, text: person.name});
        });
        next();
      }
    });
}

function addPerson(req,res,next) {
  Person.findOne({name: {$regex: req.body.name, $options: 'i'}}).exec((err,person) => {
    if (err) next(err);
    if (person) res.status(403).send("Person already exists");
    else {
      let p = new Person({name: req.body.name});
      p.save((err) => {
        if (err) next(err);
        res.person = p;
        next();
      });
    }
  });
}

function getPerson(req,res,next) {
  Person.findById(req.params.pId)
    .populate('acted')
    .populate('wrote')
    .populate('directed')
    .exec((err,person) => {
      if (err) next(err);
      if (!person) res.status(404).send(`ERROR 404: Could not find person. Person ID: ${req.params.pId}`);
      else {
        res.person = person; 
        next();
      }
    });
}

function sendPerson(req, res) {
  res.person.collaborators = [];
  res.format({
    "text/html": () => {res.status(200).render("person", {
      person: res.person,
      currentUser: req.user._id});},
    "application/json": () => {res.status(200).json(res.person)}});
}

module.exports = router;

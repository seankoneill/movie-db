const mongoose = require('mongoose');
const fs = require('fs');
const Movie = require('./models/MovieModel');
const Person = require('./models/PersonModel');
const Review = require('./models/ReviewModel');

mongoose.connect('mongodb://localhost/moviedb', {useNewUrlParser: true});
let db = mongoose.connection;

let totalMovies = 2500;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  mongoose.connection.db.dropDatabase(function(err, result){
    if(err){
      console.log("Error dropping database:");
      console.log(err);
      return;
    }
    console.log("Dropped movies database. Starting re-creation.");

    let movies = JSON.parse(fs.readFileSync("movie-data/movie-data-"+totalMovies+".json"));

    let finishedMovies = 0;
    let countFail = 0;
    let countSuccess = 0;

    let peopleDocuments = {};
    function idMap(person,movieId,fieldName) {
      if (!peopleDocuments[person]) {
        let p = new Person({
          name: person
        });
        peopleDocuments[person] = p;
      }
      peopleDocuments[person][fieldName].push(movieId);
      return peopleDocuments[person]._id;
    }

    movies.forEach(movie => {
      let m = new Movie({
        title: movie.Title,
        date: movie.Released,
        rating: movie.Rated,
        runtime: movie.Runtime.split(" ")[0],
        genres: movie.Genre,
        plot: movie.Plot,
        awards: movie.Awards,
        poster: movie.Poster,
      });

      let writerIds = movie.Writer.map((arr) => {return idMap(arr,m._id,'wrote');});
      let directorIds = movie.Director.map((arr) => {return idMap(arr,m._id,'directed');});
      let actorIds = movie.Actors.map((arr) => {return idMap(arr,m._id,'acted');});
      m.directors = directorIds;
      m.writers = writerIds;
      m.actors = actorIds;

      m.save(function(err, callback){
        finishedMovies++;
        if(err){
          countFail++;
          console.log(err.message);
        }else{
          countSuccess++;
        }

        if(finishedMovies % 500 == 0)
          console.log("Finished movie #" + finishedMovies + "/" + totalMovies);

        if(finishedMovies == totalMovies){
          let finishedPeople = 0;
          let people = Object.values(peopleDocuments);
          people.forEach(person => {
            person.save((err,callback) => {
              finishedPeople++;
              if(err)
                console.log(err.message);

              if(finishedPeople % 500 == 0)
                console.log("Finished person #" + finishedPeople + "/" + people.length);

              if (finishedPeople == people.length) {
                mongoose.connection.close();
                console.log("Finished.");
                console.log("Successfully added: " + countSuccess);
                console.log("Failed: " + countFail);
                process.exit(0);
              }
            });
          });
        }
      });
    });
  });
});

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let userSchema = Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  session: String,
  contributor: {
    type: Boolean,
    default: false,
    required: true
  },
  joined: {
    type: Date,
    required: true,
  },
  followedUsers: [{type: Schema.Types.ObjectId, ref: 'User'}],
  followedPeople: [{type: Schema.Types.ObjectId, ref: 'Person'}],
  watchedMovies: [{type: Schema.Types.ObjectId, ref: 'Movie'}],
  reviews: [{type: Schema.Types.ObjectId, ref: 'Review'}],
  peopleNotifs: [{
    source: {type: Schema.Types.ObjectId, ref: 'Person'}, 
    link: {type: Schema.Types.ObjectId, ref: 'Movie'}
  }],
  userNotifs: [{
    source: {type: Schema.Types.ObjectId, ref: 'User'}, 
    link: {type: Schema.Types.ObjectId, ref: 'Review'}
  }]
});

module.exports = mongoose.model("User", userSchema);

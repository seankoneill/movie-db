const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let reviewSchema = Schema({
  movie: {
    type: Schema.Types.ObjectId, ref: 'Movie',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  fulltext: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("Review", reviewSchema);

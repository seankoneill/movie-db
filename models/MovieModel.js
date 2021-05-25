const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let movieSchema = Schema({
  title: {
    type: String,
    required: true,
    validate: {
      validator: function(v) { return v.title != "#DUPE#"; }
    }
  },
  directors: [{type: Schema.Types.ObjectId, ref: 'Person'}],
  writers: [{type: Schema.Types.ObjectId, ref: 'Person'}],
  actors: [{type: Schema.Types.ObjectId, ref: 'Person'}],
  reviews: [{type: Schema.Types.ObjectId, ref: 'Review'}],
  date: String,
  rating: String,
  runtime: Number,
  genres: [String],
  plot: String,
  awards: String,
  poster: String
});

module.exports = mongoose.model("Movie", movieSchema);

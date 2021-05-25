const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let personSchema = Schema({
  name: {
    type: String,
    required: true,
  },
  directed: [{type: Schema.Types.ObjectId, ref: 'Movie'}],
  wrote: [{type: Schema.Types.ObjectId, ref: 'Movie'}],
  acted: [{type: Schema.Types.ObjectId, ref: 'Movie'}]
});

module.exports = mongoose.model("Person", personSchema);

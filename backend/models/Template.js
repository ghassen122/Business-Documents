const mongoose = require('mongoose')

const blankSchema = new mongoose.Schema({
  id: Number,
  marker: String,
  placeholder: String,
  name: String,
}, { _id: false })

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fileName: { type: String },
  sfdt: { type: String, required: true },
  blanks: { type: [blankSchema], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('Template', templateSchema)

const mongoose = require('mongoose');
const { Schema } = mongoose;

const subjectSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  notes_url: { type: String },
  video_url: { type: String }
});

module.exports = mongoose.model('Subject', subjectSchema);

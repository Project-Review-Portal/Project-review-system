const mongoose = require('mongoose');

const InstructionTemplateSchema = new mongoose.Schema({
  reviewInstructions: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: false, 
  },
  fileName: {
    type: String,
    required: false, 
  },
  attachments: [{
    filePath: { type: String, required: true },
    fileName: { type: String, required: true }
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  panels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panel', 
  }],
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    index: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('InstructionTemplate', InstructionTemplateSchema);
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
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  panels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panel', 
  }],
}, { timestamps: true });

module.exports = mongoose.model('InstructionTemplate', InstructionTemplateSchema);
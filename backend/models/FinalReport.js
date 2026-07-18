const mongoose = require('mongoose');

const FinalReportSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  materialSetting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialSetting',
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['uploaded', 'approved', 'rejected'],
    default: 'uploaded',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  remarks: {
    type: String,
    default: '',
  },
  rejectedAt: {
    type: Date,
    default: null,
  },
  rejections: [{
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    rejectedAt: {
      type: Date,
      default: Date.now,
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('FinalReport', FinalReportSchema); 
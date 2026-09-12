const mongoose = require('mongoose');

const MaterialSettingSchema = new mongoose.Schema({
  // panel is optional — a coordinator may create settings before a panel is assigned
  panel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panel',
    required: false,
    default: null,
  },
  programme: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  fileType: {
    type: [String],
    required: true,
    default: [],
  },
  isRequired: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    index: true,
  }
}, { timestamps: true });

// Efficient lookup by coordinator + programme + session
MaterialSettingSchema.index({ createdBy: 1, programme: 1, session: 1 });

module.exports = mongoose.model('MaterialSetting', MaterialSettingSchema);

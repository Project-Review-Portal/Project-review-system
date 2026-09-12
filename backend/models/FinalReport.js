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
    enum: ['draft', 'pending', 'uploaded', 'pending_guide', 'pending_coordinator', 'approved', 'rejected', 'guide_rejected', 'coordinator_rejected'],
    default: 'draft',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  guideApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  guideApprovedAt: {
    type: Date,
  },
  coordinatorApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  coordinatorApprovedAt: {
    type: Date,
  },
  rejectedByRole: {
    type: String,
    enum: ['guide', 'coordinator'],
  },
  remarks: {
    type: String,
    default: '',
  },
  rejectedAt: {
    type: Date,
    default: null,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    index: true,
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
const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template: { type: String, default: 'template1' },
  personalInfo: {
    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    objective: { type: String, default: '' },
    photo: { type: String, default: '' }
  },
  education: [{
    degree: { type: String },
    college: { type: String },
    year: { type: String }
  }],
  experience: [{
    jobTitle: { type: String },
    company: { type: String },
    duration: { type: String },
    description: { type: String }
  }],
  skills: [{ type: String }],
  projects: [{
    title: { type: String },
    description: { type: String },
    link: { type: String }
  }],
  certifications: [{ type: String }],
  languages: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resume', ResumeSchema);

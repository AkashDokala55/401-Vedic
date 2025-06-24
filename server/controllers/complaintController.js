const Complaint = require('../models/Complaint');
const User = require('../models/user');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// 🔐 Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'akashalpha55@gmail.com',
    pass: 'npjg haxv tdfk bvlu',
  },
});

// 📌 Academic Complaint Submission
const createAcademicComplaint = async (req, res) => {
  try {
    const { registerNumber, section, year, domain, description } = req.body;
    const department = req.user.department; 
    const newComplaint = new Complaint({
      userId: req.user.userId,
      userEmail: req.user.email,
      registerNumber,
      department,
      section,
      year,
      domain,
      description,
      imageUrl: req.file ? req.file.path : null,
      category: 'Academic',
      assignedFaculty,
      status: 'pending'
    });

    await newComplaint.save();
    res.status(201).json({ message: 'Academic complaint submitted successfully.' });
  } catch (err) {
    console.error('Error submitting academic complaint:', err);
    res.status(500).json({ message: 'Failed to submit academic complaint.' });
  }
};

// 📌 Non-Academic Complaint Submission
const createNonAcademicComplaint = async (req, res) => {
  try {
    const { registerNumber, section, year, domain, description } = req.body;
    const department = req.user.department;

    // 🔍 Find a suitable faculty for assignment
    const faculty = await Employee.findOne({
      department: department,
      employeeCategory: 'Non-Academic',
      status: 'approved'
    });

    if (!faculty) {
      return res.status(404).json({ message: 'No Non-Academic faculty found for this department.' });
    }

    const newComplaint = new Complaint({
      userId: req.user.userId,
      userEmail: req.user.email,
      registerNumber,
      department,
      section,
      year,
      domain,
      description,
      imageUrl: req.file ? req.file.path : null,
      category: 'Non-Academic',
      assignedFaculty: faculty._id, // ✅ Correctly assigned
      status: 'pending'
    });

    await newComplaint.save();
    res.status(201).json({ message: 'Non-Academic complaint submitted successfully.' });
  } catch (err) {
    console.error('Error submitting non-academic complaint:', err);
    res.status(500).json({ message: 'Failed to submit non-academic complaint.' });
  }
};

// 📌 Get complaints submitted by the logged-in user
const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.userId });
    res.status(200).json(complaints);
  } catch (err) {
    console.error('Error fetching user complaints:', err);
    res.status(500).json({ message: 'Failed to fetch your complaints.' });
  }
};

// 📌 Get total complaint count (admin/user)
const getComplaintCount = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const pending = await Complaint.countDocuments({ status: 'Pending' });

    res.json({ total, resolved, pending });
  } catch (err) {
    console.error('Error counting complaints:', err);
    res.status(500).json({ message: 'Failed to count complaints.' });
  }
};

// 📌 Get all complaints (Admin)
const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (err) {
    console.error('Error fetching all complaints:', err);
    res.status(500).json({ message: 'Failed to fetch complaints.' });
  }
};

// 📌 Get complaints by domain (Employee only)
const getComplaintsByDomain = async (req, res) => {
  try {
    const domain = req.user.domain; // From JWT
    const complaints = await Complaint.find({ department: domain }).sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (err) {
    console.error('Error fetching complaints by domain:', err);
    res.status(500).json({ message: 'Failed to fetch domain-specific complaints.' });
  }
};

// 📌 Employee: Update complaint status + add response + email user

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Allow only domain-matching employees
    if (req.user.role === 'employee' && req.user.domain !== complaint.department) {
      return res.status(403).json({ message: 'Unauthorized to update this complaint' });
    }

    complaint.status = status;
    complaint.response = response;
    await complaint.save();

    // Send email to user
    await transporter.sendMail({
      from: 'akashalpha55@gmail.com',
      to: complaint.userEmail,
      subject: `FixIt - Complaint ${status}`,
      text: `Hi,\n\nYour complaint for "${complaint.domain}" has been marked as "${status}".\nResponse: ${response || 'N/A'}\n\n- FixIt Team`
    });

    res.status(200).json({ message: 'Complaint updated and user notified', complaint });
  } catch (err) {
    console.error('Error updating complaint:', err);
    res.status(500).json({ message: 'Server error while updating complaint.' });
  }
};
const createFacultyComplaint = async (req, res) => {
  try {
    const { title, description, userEmail, assignedFaculty } = req.body;

    const complaint = new Complaint({
      title,
      description,
      userEmail,
      assignedFaculty,
      status: 'pending',
    });

    await complaint.save();
    res.json({ message: 'Complaint sent to faculty', complaint });
  } catch (err) {
    console.error('Faculty complaint error:', err);
    res.status(500).json({ message: 'Could not submit complaint' });
  }
};


module.exports = {
  updateComplaintStatus
};
// ✅ Export all
module.exports = {
  createAcademicComplaint,
  createNonAcademicComplaint,
  getMyComplaints,
  getComplaintCount,
  getAllComplaints,
  getComplaintsByDomain,
  updateComplaintStatus,
  createFacultyComplaint
};
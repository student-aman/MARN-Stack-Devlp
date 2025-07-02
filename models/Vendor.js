const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Please add your company/individual name']
    },
    contactPerson: {
        type: String,
        required: [true, 'Please add a contact person name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true, // Email unique होना चाहिए
        match: [/.+@.+\..+/, 'Please fill a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number']
    },
    serviceCategory: {
        type: String,
        required: [true, 'Please select your primary service category'],
        enum: ['Home Services', 'IT & Tech', 'Design & Creative', 'Events & Parties', 'Other'], // Categories jo tum support karte ho
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters'],
        default: ''
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pending Review', 'Approved', 'Rejected'], // Admin review ke liye status
        default: 'Pending Review'
    }
});

module.exports = mongoose.model('Vendor', vendorSchema);

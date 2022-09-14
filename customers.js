const mongoose = require('mongoose')

const customersSchema = new mongoose.Schema({
    name: String,
    apiKey: String,
    recipients: [String],
    sendDates: [Date],
})

const customers = mongoose.model('customers', customersSchema)

module.exports = customers
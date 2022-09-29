const mongoose = require('mongoose')

const customersSchema = new mongoose.Schema({
    name: String,
    apiKey: String,
    recipients: [String],
    prefix: String,
    suffix: String,
    useHtml: Boolean,
    html: String,
}, {timestamps: true})

const sendLogsSchema = new mongoose.Schema({
    customer: mongoose.ObjectId,
    timestap: Date,
    metadata: Object,
}, {
    timeseries: {
        timeField: 'timestap',
        metaField: 'metadata',
    }
})


const customers = mongoose.model('customers', customersSchema)
const sendLogs = mongoose.model('sendLogs', sendLogsSchema)

module.exports = { customers, sendLogs }
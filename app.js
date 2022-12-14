require('dotenv').config()
const express = require('express')
const cors = require('cors')
const nodeMailer = require('nodemailer')
const validator = require('validator')
const xssFilters = require('xss-filters')
const rateLimit = require('express-rate-limit')
const NodeCache = require( "node-cache" );
const mongoose = require('mongoose')
const ejs = require('ejs')
const myCache = new NodeCache({stdTTL: 600, checkperiod: 1200});

const app = express()
app.use(express.json())
app.use(cors())
app.options('*', cors())

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 100 requests per windowMs
})

const { customers, sendLogs } = require('./customers')


app.get('/', (req, res) => {
    return res.send('Alive')
})

app.post('/', limiter, async (req, res) => {
    const attibutes = ['name', 'email', 'msg', 'apiKey', 'subject']

    const sanitizedAttributes = attibutes.map(n => cleanData(n, req.body[n]))

    const someInvalid = sanitizedAttributes.some(n => !n)
    if (someInvalid) {
        return res.status(422).json({ error: 'Invalid data' })
    }

    var myAttributes = req.body
    var customer = myCache.get(myAttributes.apiKey)
    if (customer == undefined) {
        customer = await customers.findOne({ apiKey: myAttributes.apiKey })
        myCache.set(myAttributes.apiKey, customer)
    }
    if (!customer) {
        return res.status(422).json({ error: 'Unknown customer' })
    }

    const err = await sendMail(myAttributes, customer)
    if (err) {
        res.status(500).json({ error: err })
    } else {
        res.status(200).json({ message: 'Mail sent' })
    }
})

const cleanData = (key, value) => {
    const checkerFunctions = {
        name: v => v.lenght < 4,
        email: v => !validator.isEmail(v),
        msg: v => v.length < 5,
        apiKey: v => v.lenght < 10,
        subject: v => v.length < 4,
    }

    return checkerFunctions[key] && !checkerFunctions[key](value) && xssFilters.inHTMLData(value)
}

const sendMail = async (myAttributes, customer) => {
    let SMTPSSL = false

    if (process.env.SMTP_SSL == "true") {
        SMTPSSL = true
    }

    const transporter = nodeMailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: SMTPSSL,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    if (customer.useHtml) {
        const html = await ejs.render(customer.html, { data: myAttributes })
        try {

            customer.recipients.forEach((email) => {
                transporter.sendMail({
                    from: process.env.SMTP_FROM,
                    to: email,
                    subject: myAttributes.subject,
                    html: html
                })
            })
        } catch (e) {
            console.log(e)
            return e
        }

    } else {
        if (customer.prefix == null) {
            customer.prefix = ''
        }
        if (customer.suffix == null) {
            customer.suffix = ''
        }
        customer.recipients.forEach((email) => {
            transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: email,
                subject: myAttributes.subject,
                text: `
                ${customer.prefix} ${myAttributes.name} (${myAttributes.email}):

                ${myAttributes.msg}
                ${customer.suffix}
                `
            })
        })
    }
    const log = new sendLogs({
        customer: customer._id,
        timestap: new Date(),
        metadata: {
            name: customer.name,
        }
    })
    await log.save()
    return null
}

app.listen(3000, async () => {
    console.log("Starting")
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Server listening on port 3000')
})
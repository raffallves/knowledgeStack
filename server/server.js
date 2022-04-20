const express = require('express')
const cors = require('cors')

const app = express()
require('dotenv').config({ debug: true })
console.log(process.env)
const port = process.env.PORT || 5000
const routes = require('./routes/record')

app.use(cors)
app.use(express.json())
app.use(routes)

const dbo = require('./db/conn')

app.listen(port, () => {
    dbo.connectToServer((err) => {
        if (err) {
            console.error(err)
        }
    })
    console.log(`Server running on port ${port}`)
})
const express = require('express')
const cors = require('cors')
require('dotenv').config({ debug: true })

const app = express()
const port = process.env.PORT || 5000
const routes = require('./routes/record')

/* Middleware */
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false}))
/* Routes */
app.use(routes)

const db = require('./db/neo4j.js')

const {
    NEO4J_URI,
    NEO4J_USER,
    NEO4J_PASSWORD,
} = process.env

app.listen(port, () => {
    db.initDriver(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    console.log(`Server running on port ${port}`)
})
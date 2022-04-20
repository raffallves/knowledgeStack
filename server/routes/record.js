const express = require('express')

const recordRoutes = express.Router()

const dbo = require('../db/conn.js')
const ObjectId = require('mongodb').ObjectId

// Get list of all records
recordRoutes.route('/record').get((req, res) => {
    let db_connect = dbo.getGb('myFirstDatabase')
    db_connect
        .collection('records')
        .find({})
        .toArray((err, result) => {
            if (err) throw err
            res.json(result)
        })
})

// Get record by id
recordRoutes.route('/record/:id').get((req, res) => {
    let db_connect = dbo.getDb()
    let myquery = { _id: ObjectId(req.params.id) }
    db_connect
        .collection('records')
        .findOne(myquery, (err, result) => {
            if (err) throw err
            res.json(result)
        })
})

module.exports = recordRoutes
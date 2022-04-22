const express = require('express')
const { int, session } = require('neo4j-driver')
const db = require('../db/neo4j.js')

const router = express.Router()

// Get list of all records
router.get('/', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()

    try {
        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book) RETURN book LIMIT 10`)
        })

        const nodes = response.records.map(row => {
            const book = row.get('book').properties
            const entry = {
                title: book.title,
                pages: book.pages.toNumber(),
                year: book.year.toNumber(),
                read: book.read
            }
            return entry
        })
        
        return res.json(nodes)

    } catch (e) {
        console.error(e)
    } finally {
        await session.close()
    }
})

// Get record by id
// router.get('/record/:id', (req, res) => {
    
// })

module.exports = router
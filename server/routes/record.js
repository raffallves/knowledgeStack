const express = require('express')
const { int } = require('neo4j-driver')
const db = require('../db/neo4j.js')
const aws = require('../db/aws.js')

const router = express.Router()

// Get list of all records
router.get('/', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)

    try {
        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book) RETURN book LIMIT 10`)
        })

        const nodes = response.records.map(row => {
            const bookId = row.get('book').identity.toNumber()
            const book = row.get('book').properties
            const entry = {
                id: bookId,
                title: book.title,
                pages: book.pages.toNumber(),
                year: book.year.toNumber(),
                read: book.read,
                cover: null
            }
            return entry
        })

        for (let i = 0; i < nodes.length; i++) {
            const coverUrl = await aws.getCoverUrl(process.env.AWS_BUCKET, nodes[i].id)
            nodes[i].cover = coverUrl
        }
        
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
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
            return tx.run(`MATCH (book:Book)<--(author) WITH author, book RETURN book, collect(author) AS authors LIMIT 10`)
        })

        const nodes = response.records.map(row => {
            const authors = row.get('authors')
            const book = row.get('book')

            const entry = {
                id: book.identity.toNumber(),
                title: book.properties.title,
                pages: book.properties.pages.toNumber(),
                year: book.properties.year.toNumber(),
                read: book.properties.read,
                authors: authors.map(node => {
                    const author = {
                        id: node.identity.toNumber(),
                        name: node.properties.first_name + ' ' + node.properties.last_name
                    }
                    return author
                }),
                cover: null
            }
            return entry
        })
        // Authors come duplicated, so it screws up the UI -> fix it
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
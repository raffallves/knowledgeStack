const express = require('express')
const { int } = require('neo4j-driver')
const sortAuthorNames = require('../utils/sortAuthorNames')
const db = require('../db/neo4j.js')
const aws = require('../db/aws.js')

const router = express.Router()

// Get list of initial records
router.get('/', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)

    try {
        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book)<--(author) 
                           WITH author, book 
                           RETURN book, collect(author) AS authors
                           ORDER BY id(book)
                           LIMIT 30`)
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

// Get more records
router.get('/more/:skip', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)
    
    try {
        const skip = int(parseInt(req.params.skip, 10))

        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book)<--(author)
                           WITH author, book
                           RETURN book, collect(author) AS authors
                           ORDER BY id(book)
                           SKIP $skip
                           LIMIT 30`, {skip})
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


// Add book
router.post('/', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)

    try {
        const title = req.body.title
        const year = int(req.body.year)
        const pages = int(req.body.pages)
        const read = req.body.read
        const authors = sortAuthorNames(req.body.authors)
        
        const response = await session.writeTransaction(tx => {
            return tx.run(`UNWIND $authors AS author
                           MERGE (book:Book {title: $title})
                           ON CREATE SET book.pages = $pages, book.year = $year, book.read = $read
                           MERGE (a:Author {first_name: author.firstName, last_name: author.lastName})
                           MERGE (a)-[r:WROTE]->(book)
                           RETURN a, r, book`, {title, year, pages, read, authors})
        })

        const node = response.records[0].get('book')

        return res.status(201).send('Created record: ' + node)

    } catch (e) {
        console.error(e)
    } finally {
        await session.close()
    }
})



// Mark book as read
router.put('/read', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()

    try {
        const read = req.body.read
        const title = req.body.title

        const response = await session.writeTransaction(tx => {
            return tx.run(`MATCH (book:Book) WHERE book.title = $title
                           SET book.read = $read
                           RETURN book`, {title, read})
        })

        const node = response.records[0].get('book')

        return res.send('Ok, edited node: ' + node)

    } catch (e) {
        console.error(e)
    } finally {
        await session.close()
    }
})

module.exports = router
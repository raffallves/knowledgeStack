const express = require('express')
const { int } = require('neo4j-driver')
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const sortAuthorNames = require('../utils/sortAuthorNames')
const db = require('../db/neo4j.js')
const aws = require('../db/aws.js')

const router = express.Router()

// Send login auth token
router.post('/login', (req, res) => {
    
    res.send({
        token: 'test#$%'
    })
})

// Get list of initial records
router.get('/:read', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)

    try {
        const haveRead = req.params.read === 'true' ? true : false

        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book)<--(author) 
                           WITH author, book
                           WHERE book.read = $haveRead
                           RETURN book, collect(author) AS authors
                           ORDER BY id(book)
                           LIMIT 30`, {haveRead})
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
router.get('/more/:read/:skip', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)
    
    try {
        const skip = int(parseInt(req.params.skip, 10))
        const haveRead = req.params.read === 'true' ? true : false

        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book)<--(author)
                           WITH author, book
                           WHERE book.read = $haveRead
                           RETURN book, collect(author) AS authors
                           ORDER BY id(book)
                           SKIP $skip
                           LIMIT 30`, {skip, haveRead})
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

// Search book by title
router.get('/search/:query', async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    
    try {
        const query = req.params.query
        const regex = `(?i).*${query}.*`

        const response = await session.readTransaction(tx => {
            return tx.run(`MATCH (book:Book)<--(author)
                           WITH author, book
                           WHERE book.title =~ $regex
                           RETURN book, collect(author) AS authors
                           ORDER BY id(book)`, {regex})
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
        session.close()
    }
})


// Add book
router.post('/', upload.single('file'), async (req, res) => {
    const driver = db.getDriver()
    const session = driver.session()
    const s3 = aws.createAWSClient(process.env.AWS_REGION)

    try {
        const title = req.body.title
        const year = int(req.body.year)
        const pages = int(req.body.pages)
        const read = req.body.read === "no" ? false : true
        const authors = sortAuthorNames(req.body.author)
        
        const response = await session.writeTransaction(tx => {
            return tx.run(`UNWIND $authors AS author
                           MERGE (book:Book {title: $title})
                           ON CREATE SET book.pages = $pages, book.year = $year, book.read = $read
                           MERGE (a:Author {first_name: author.firstName, last_name: author.lastName})
                           MERGE (a)-[r:WROTE]->(book)
                           RETURN a, r, book`, {title, year, pages, read, authors})
        })

        const id = response.records[0].get('book').identity.toNumber()
        
        const cover = req.file.buffer
        
        const uploadedCover = aws.uploadCover(s3, process.env.AWS_BUCKET, id, cover)
        
        return res.status(201).send('Created record: ' + id + ', File uploaded: ' + uploadedCover)

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
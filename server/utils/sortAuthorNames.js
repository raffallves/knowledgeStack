module.exports = function sortAuthorNames(data) {
    const authors = data.split(';') // Separate names into array items
    let names = [] // Container array

    authors.map(author => {
        /* Make sure to come back and check the edge case of the dotted out names (e.g. R. Steiner)*/
        /* There's also the edge case of a name typed in all caps or in no caps at all */
    
        author = author.trim() // Remove whitespace from strings
        const gap = author.indexOf(' ') // Find the gap between the first and last names
        
        const name = {
            firstName: author.slice(0, gap),
            lastName: author.substring(gap + 1)
        }
        names.push(name)
    })

    return names
}
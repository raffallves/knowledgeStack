const neo4j = require('neo4j-driver')

let driver

module.exports = {
    initDriver: (uri, username, password) => {
        driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

        return driver.verifyConnectivity().then(() => driver)
    },
    getDriver: () => {
        return driver
    },
    closeDriver: () => {
        return driver.close()
    }
}
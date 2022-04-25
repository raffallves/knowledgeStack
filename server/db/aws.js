const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

let s3

module.exports = {
    createAWSClient: (region) => {
        s3 = new S3Client({region: region})
        return s3
    },
    getCoverUrl: (bucket, coverId) => {
        const command = new GetObjectCommand({Bucket: bucket, Key: `${coverId}.jpg`})
        const url = getSignedUrl(s3, command)
        return url
    }
}
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
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
    },
    uploadCover: async (s3, bucket, coverId, file) => {
        const command = new PutObjectCommand({Bucket: bucket, Key: `${coverId}.jpg`, Body: file})
        const data = await s3.send(command)
        return data
    }
}
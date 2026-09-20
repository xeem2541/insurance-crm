const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const isS3Configured = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME;

let s3Client = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    // Useful for Cloudflare R2 or MinIO
    ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
  });
}

/**
 * Uploads a file buffer to S3
 * @param {Buffer} buffer The file buffer to upload
 * @param {string} key The file path/name in the bucket (e.g., 'documents/motor_123.pdf')
 * @param {string} mimetype The MIME type of the file
 * @returns {Promise<boolean>} True if successful
 */
const uploadFileToS3 = async (buffer, key, mimetype) => {
  if (!isS3Configured) return false;

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Generates a presigned URL to view/download a file securely
 * @param {string} key The file path/name in the bucket
 * @param {number} expiresIn URL expiration time in seconds (Default 15 mins)
 * @returns {Promise<string|null>} The signed URL or null if not configured
 */
const getPresignedUrl = async (key, expiresIn = 900) => {
  if (!isS3Configured) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    
    // Generate a secure, expiring URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

module.exports = {
  isS3Configured,
  uploadFileToS3,
  getPresignedUrl
};

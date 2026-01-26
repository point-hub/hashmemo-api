export interface IS3Config {
  endpoint: string
  publicDomain: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export const endpoint = `${process.env['S3_ENDPOINT']}`;
export const publicDomain = `${process.env['S3_PUBLIC_DOMAIN']}`;
export const bucket = `${process.env['S3_BUCKET']}`;
export const accessKeyId = `${process.env['S3_ACCESS_KEY_ID']}`;
export const secretAccessKey = `${process.env['S3_SECRET_ACCESS_KEY']}`;

const s3Config: IS3Config = { endpoint, publicDomain, bucket, accessKeyId, secretAccessKey };

export default s3Config;

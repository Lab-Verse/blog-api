require('dotenv').config();
const { S3Client, PutObjectCommand, ListBucketsCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

const endpoint = process.env.CLOUDFLARE_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;

console.log('Endpoint:', endpoint);
console.log('Bucket:', bucketName);
console.log('Access Key ID:', accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'MISSING');
console.log('Secret Key:', secretAccessKey ? 'SET (' + secretAccessKey.length + ' chars)' : 'MISSING');
console.log('');

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

async function test() {
  // Test 1: List buckets
  console.log('Test 1: ListBuckets...');
  try {
    const result = await s3.send(new ListBucketsCommand({}));
    console.log('Buckets:', result.Buckets?.map(b => b.Name));
  } catch (e) {
    console.log('ListBuckets FAILED:', e.Code || e.name, '-', e.message);
  }

  // Test 2: Head bucket
  console.log('\nTest 2: HeadBucket...');
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log('Bucket exists and accessible!');
  } catch (e) {
    console.log('HeadBucket FAILED:', e.Code || e.name, '-', e.message);
  }

  // Test 3: Upload test file
  console.log('\nTest 3: PutObject...');
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'test/test-upload.txt',
      Body: Buffer.from('Hello R2 test'),
      ContentType: 'text/plain',
    }));
    console.log('Upload SUCCESS!');
  } catch (e) {
    console.log('PutObject FAILED:', e.Code || e.name, '-', e.message);
    if (e.$metadata) {
      console.log('HTTP Status:', e.$metadata.httpStatusCode);
    }
  }
}

test();

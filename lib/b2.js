import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client = null;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function getB2() {
  if (!_client) {
    _client = new S3Client({
      region: requireEnv("B2_REGION"),
      endpoint: requireEnv("B2_ENDPOINT"),
      credentials: {
        accessKeyId: requireEnv("B2_KEY_ID"),
        secretAccessKey: requireEnv("B2_APP_KEY"),
      },
      forcePathStyle: false,
    });
  }
  return _client;
}

export function bucket() {
  return requireEnv("B2_BUCKET");
}

export async function presignPut(key, contentType, expiresIn = 600) {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  return getSignedUrl(getB2(), cmd, { expiresIn });
}

export async function presignGet(key, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(getB2(), cmd, { expiresIn });
}

export async function listKeys(prefix, { max = 48, token } = {}) {
  const out = await getB2().send(
    new ListObjectsV2Command({
      Bucket: bucket(),
      Prefix: prefix,
      MaxKeys: max,
      ContinuationToken: token,
    })
  );
  const items = (out.Contents || [])
    .filter((o) => o.Key && !o.Key.endsWith("/"))
    .map((o) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
  return { items, nextToken: out.NextContinuationToken || null };
}

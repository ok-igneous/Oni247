# Object storage configuration

Oni247 uses S3-compatible object storage for business uploads. Cloudflare R2 is supported.

## Required environment

- `S3_ENDPOINT`: account endpoint for R2; omit for AWS S3.
- `S3_REGION`: use `auto` for R2.
- `S3_BUCKET`: bucket name.
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`: bucket-scoped credentials.
- `PUBLIC_ASSETS_BASE_URL`: public custom domain mapped to the bucket root.

The API creates five-minute presigned PUT URLs. The signature binds the object key, content type and declared content length. The browser uploads directly to the bucket; application servers do not proxy file bytes.

## Bucket CORS

Configure the bucket to allow browser PUT requests from the production Oni247 origin and the local development origin used for testing. Allow the `PUT` method and the `Content-Type` request header. Do not use a wildcard origin for production.

## Public delivery

Map the public asset hostname to the bucket through the storage provider's supported public-domain mechanism. The public URL is generated as:

```
PUBLIC_ASSETS_BASE_URL/businesses/{businessId}/{kind}/{randomFileName}
```

Do not make the bucket writeable anonymously. Only presigned URLs should authorize uploads.

## Migration

Copy existing legacy-hosted objects to matching keys in this bucket, verify object counts and checksums, then update database URLs from legacy `/_cdn/` paths to the new public asset hostname. Keep a reversible mapping until the new production deployment is accepted.

import { s3Service } from "../src/services/s3.service";

async function testS3() {
  try {
    console.log("Testing AWS S3 connection...");

    const buffer = Buffer.from(
      "Hello from ACS Customer Services Backend!"
    );

    const result = await s3Service.uploadFile(
      buffer,
      `test/hello-${Date.now()}.txt`,
      "text/plain",
      {
        source: "local-backend-test",
      }
    );

    console.log("✅ S3 upload successful!");
    console.log(result);
  } catch (error) {
    console.error("❌ S3 upload failed:");
    console.error(error);
    process.exit(1);
  }
}

testS3();
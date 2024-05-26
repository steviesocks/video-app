import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const storage = new Storage();

const rawVideoBucketName = "ssva-raw-videos";
const processedVideoBucketName = "ssva-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

// create local dirs for raw and processed
export function setupDirectories() {
  ensureDirectoryExists(localProcessedVideoPath)
  ensureDirectoryExists(localRawVideoPath)
}

/**
 * @param rawVideoName
 * @param processedVideoName
 * @returns A promise that resolves when the video has been converted
 */
export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360")
      .on("end", () => {
        console.log("Processed successfully:", rawVideoName);
        console.log("Saved at", `${localProcessedVideoPath}/${processedVideoName}`)
        resolve();
      })
      .on("error", (err) => {
        console.log("error");
        console.error("An error occured: ", err.message);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

/**
 * @param fileName
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder
 * @returns A promise that resolves when the file has been downloaded
 */
export async function downloadRawVideo(fileName: string) {
  await storage
    .bucket(rawVideoBucketName)
    .file(fileName)
    .download({ destination: `${localRawVideoPath}/${fileName}` });

  console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}`);
}

/**
 *
 * @param fileName
 * {@link localProcessedVideoPath} folder into the {@link processedVideoBucketName} folder
 * @returns A promise that resovles when the file has been uploaded
 */
export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);
  await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
    destination: fileName,
  });

  console.log(`${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}`);

  await bucket.file(fileName).makePublic();
}

/**
 *
 * @param filePath
 * @returns promise that resolves when the file is deleted or doesn't exist
 */
function deleteFile(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(`Failed to delete file at ${filePath}`, err);
          reject(err);
        } else {
          console.log(`File deleted at ${filePath}`);
          resolve();
        }
      });
    } else {
      console.log(`File at ${filePath} not found. Skipping delete.`);
      resolve();
    }
  });
}

/**
 *
 * @param fileName
 * @returns
 */
export function deleteRawVideo(fileName: string) {
  return deleteFile(`${localRawVideoPath}/${fileName}`);
}

/**
 *
 * @param fileName
 * @returns
 */
export function deleteProcessVideo(fileName: string) {
  return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * 
 * @param dirPath 
 */
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created at ${dirPath}`);
  }
}

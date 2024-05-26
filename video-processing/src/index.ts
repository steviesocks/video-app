import express from "express";
import { convertVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from "./storage";

setupDirectories();

const app = express();
app.use(express.json());

app.post("/process-video", async (req, res) => {
  let data;
  try {
    const message = Buffer.from(req.body.message.data, "base64").toString("utf8");
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error("Invalid message payload");
    }
  } catch (error) {
    console.error(error);
    return res.status(400).send("Bad request: missing filename");
  }

  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;

  // get raw file
  await downloadRawVideo(inputFileName);

  // do processing
  try {
    await convertVideo(inputFileName, outputFileName);
  } catch (err) {
    await Promise.all([deleteRawVideo(inputFileName), deleteRawVideo(outputFileName)]);
    console.error(err);
    return res.status(500).send("Error processing video");
  }

  // upload processed file
  await uploadProcessedVideo(outputFileName);

  await Promise.all([deleteRawVideo(inputFileName), deleteRawVideo(outputFileName)]);
  return res.status(200).send("Processing completed successfully")
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("listening on ", port);
});

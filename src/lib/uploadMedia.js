import api from "./api";

/**
 * Sending a photo or a video from the software to the public website.
 *
 * It works the way uploading to Google Drive does: the file leaves this
 * computer once, goes to a service built to store it, and what comes back is a
 * permanent link. The link — not the file — is what gets saved on the content
 * record and handed to the website.
 *
 * What it deliberately does not do is send the file to our own server first.
 * That is how this used to work and it lost every file: our server's hosting
 * wipes its disk on every deploy and whenever it idles, so a photo uploaded in
 * the morning was a broken image by the afternoon. Videos never worked at all,
 * because the file was encoded into the request body and outgrew the size a
 * body is allowed to be.
 *
 * So the server's only job here is permission. It signs a one-time pass —
 * which it can do because it holds the Cloudinary secret and the browser never
 * does — and the browser sends the file straight on. Nothing large touches our
 * hosting, which is what finally makes video possible.
 *
 * onProgress is given 0–100 so a long video upload can show a bar rather than
 * a spinner someone will assume has frozen.
 */
export async function uploadMedia(file, mediaType, { onProgress } = {}) {
  const wanted = mediaType === "video" ? "video/" : "image/";
  if (!file.type.startsWith(wanted)) throw new Error(`Choose a ${mediaType} file.`);

  // Ask before uploading. This both fetches the signature and tells us the
  // ceiling, so somebody who picked a 400 MB video finds out now instead of
  // after ten minutes of uploading.
  const permit = await api.mediaUploadSignature(mediaType);

  if (file.size > permit.maxBytes) {
    const mb = Math.round(permit.maxBytes / (1024 * 1024));
    throw new Error(
      `That ${mediaType} is ${Math.round(file.size / (1024 * 1024))} MB. ` +
      `The limit is ${mb} MB — compress it or choose a shorter clip.`
    );
  }

  const form = new FormData();
  form.append("file", file);
  // Exactly the parameters the server signed, and no others: Cloudinary
  // recomputes the signature over what it receives and rejects a mismatch.
  form.append("api_key", permit.apiKey);
  form.append("timestamp", permit.timestamp);
  form.append("folder", permit.folder);
  form.append("signature", permit.signature);

  // XMLHttpRequest rather than fetch purely for upload progress, which fetch
  // still cannot report.
  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", permit.uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url) return resolve(body);
      reject(new Error(
        body?.error?.message
          ? "The upload was refused: " + body.error.message
          : "The upload did not complete. Try again."
      ));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));

    xhr.send(form);
  });

  return { mediaUrl: result.secure_url, bytes: result.bytes };
}

/**
 * Media uploaded before this changed lives at a /uploads/... path on our own
 * server, where the file is long gone. Worth saying so plainly in the editor:
 * the record still looks fine, and only the picture on the live website is
 * missing.
 */
export function isLostUpload(mediaUrl) {
  return /^\/?uploads\//i.test(String(mediaUrl || ""));
}

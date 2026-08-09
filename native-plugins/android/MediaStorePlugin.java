package com.neogallery.app;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.provider.MediaStore;
import android.util.Size;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * NOTE: this queries MediaStore.Images.Media and MediaStore.Video.Media
 * SEPARATELY (the type-specific collections) rather than the generic
 * MediaStore.Files collection. Per Android's own docs, on API 29+ the
 * generic Files collection only reliably returns items the CALLING APP
 * itself created -- it does not reliably show photos/videos created by
 * the camera, WhatsApp, or other apps, even with storage permission
 * granted. Images.Media / Video.Media do not have that restriction.
 * https://developer.android.com/training/data-storage/shared/media
 */
@CapacitorPlugin(
    name = "MediaStorePlugin",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO },
            alias = "media"
        ),
        @Permission(
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE },
            alias = "storage"
        )
    }
)
public class MediaStorePlugin extends Plugin {

    // Registered once when the plugin loads (must happen before the Activity
    // reaches STARTED) so that later calls can launch the system's delete
    // confirmation dialog and receive the result.
    private ActivityResultLauncher<IntentSenderRequest> deleteLauncher;
    private String pendingDeleteCallId;

    @Override
    public void load() {
        super.load();
        deleteLauncher = bridge.registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                if (pendingDeleteCallId == null) return;
                PluginCall savedCall = bridge.getSavedCall(pendingDeleteCallId);
                pendingDeleteCallId = null;
                if (savedCall == null) return;

                boolean success = result.getResultCode() == Activity.RESULT_OK;
                JSObject ret = new JSObject();
                ret.put("success", success);
                savedCall.resolve(ret);
                bridge.releaseCall(savedCall);
            }
        );
    }

    // Deletes the given items from the device's real storage (not just from
    // the app's own list). On Android 11+ this shows the system's own
    // one-time confirmation dialog (MediaStore.createDeleteRequest) -- the
    // same dialog Google Photos and other gallery apps use -- and the files
    // are only removed if the user approves it. On Android 10 and below,
    // apps holding storage permission can delete directly without a prompt.
    @PluginMethod
    public void deleteMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }

        JSArray itemsArr = call.getArray("items");
        if (itemsArr == null || itemsArr.length() == 0) {
            call.reject("No items specified");
            return;
        }

        try {
            List<Uri> uris = new ArrayList<>();
            for (int i = 0; i < itemsArr.length(); i++) {
                JSONObject obj = itemsArr.getJSONObject(i);
                long id = obj.getLong("mediaId");
                boolean isVideo = obj.optBoolean("isVideo", false);
                Uri base = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                uris.add(ContentUris.withAppendedId(base, id));
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                PendingIntent pi = MediaStore.createDeleteRequest(getContext().getContentResolver(), uris);
                call.setKeepAlive(true);
                bridge.saveCall(call);
                pendingDeleteCallId = call.getCallbackId();
                deleteLauncher.launch(new IntentSenderRequest.Builder(pi.getIntentSender()).build());
            } else {
                int deletedCount = 0;
                for (Uri uri : uris) {
                    try {
                        deletedCount += getContext().getContentResolver().delete(uri, null, null);
                    } catch (Exception ignored) {
                    }
                }
                JSObject ret = new JSObject();
                ret.put("success", deletedCount > 0);
                ret.put("deletedCount", deletedCount);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Error deleting media: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = hasMediaPermission();
        result.put("granted", granted);
        result.put("permissionState", granted ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasMediaPermission()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("permissionState", "granted");
            call.resolve(result);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("media", call, "permissionsCallback");
        } else {
            requestPermissionForAlias("storage", call, "permissionsCallback");
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = hasMediaPermission();
        result.put("granted", granted);
        result.put("permissionState", granted ? "granted" : "denied");
        call.resolve(result);
    }

    private boolean hasMediaPermission() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ctx.checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) == android.content.pm.PackageManager.PERMISSION_GRANTED
                && ctx.checkSelfPermission(Manifest.permission.READ_MEDIA_VIDEO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            return ctx.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
    }

    // ------------------------------------------------------------------
    // Internal row model shared by the images & video queries
    // ------------------------------------------------------------------
    private static class Row {
        long id;
        boolean isVideo;
        String name;
        String mimeType;
        long sizeBytes;
        long dateModifiedSec;
        String bucketId;
        String bucketName;
        int width;
        int height;
        long durationMs;
        String data;
        Uri contentUri;
    }

    private List<Row> queryImages(String bucketId) {
        List<Row> rows = new ArrayList<>();
        Uri uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = new String[] {
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATE_MODIFIED,
            MediaStore.Images.Media.BUCKET_ID,
            MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.DATA,
        };
        String selection = null;
        String[] args = null;
        if (bucketId != null && !bucketId.isEmpty()) {
            selection = MediaStore.Images.Media.BUCKET_ID + "=?";
            args = new String[] { bucketId };
        }
        String sortOrder = MediaStore.Images.Media.DATE_MODIFIED + " DESC";

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, args, sortOrder)) {
            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(MediaStore.Images.Media._ID);
                int nameIdx = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME);
                int mimeIdx = cursor.getColumnIndex(MediaStore.Images.Media.MIME_TYPE);
                int sizeIdx = cursor.getColumnIndex(MediaStore.Images.Media.SIZE);
                int dateIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATE_MODIFIED);
                int bucketIdIdx = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_ID);
                int bucketNameIdx = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_DISPLAY_NAME);
                int widthIdx = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH);
                int heightIdx = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT);
                int dataIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATA);

                while (cursor.moveToNext()) {
                    Row r = new Row();
                    r.id = cursor.getLong(idIdx);
                    r.isVideo = false;
                    r.name = nameIdx != -1 ? cursor.getString(nameIdx) : null;
                    r.mimeType = mimeIdx != -1 ? cursor.getString(mimeIdx) : null;
                    r.sizeBytes = sizeIdx != -1 ? cursor.getLong(sizeIdx) : 0;
                    r.dateModifiedSec = dateIdx != -1 ? cursor.getLong(dateIdx) : 0;
                    r.bucketId = bucketIdIdx != -1 ? cursor.getString(bucketIdIdx) : null;
                    r.bucketName = bucketNameIdx != -1 ? cursor.getString(bucketNameIdx) : null;
                    r.width = widthIdx != -1 ? cursor.getInt(widthIdx) : 0;
                    r.height = heightIdx != -1 ? cursor.getInt(heightIdx) : 0;
                    r.data = dataIdx != -1 ? cursor.getString(dataIdx) : null;
                    r.contentUri = ContentUris.withAppendedId(uri, r.id);
                    rows.add(r);
                }
            }
        } catch (Exception ignored) {
        }
        return rows;
    }

    private List<Row> queryVideos(String bucketId) {
        List<Row> rows = new ArrayList<>();
        Uri uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        String[] projection = new String[] {
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.DATE_MODIFIED,
            MediaStore.Video.Media.BUCKET_ID,
            MediaStore.Video.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.DATA,
        };
        String selection = null;
        String[] args = null;
        if (bucketId != null && !bucketId.isEmpty()) {
            selection = MediaStore.Video.Media.BUCKET_ID + "=?";
            args = new String[] { bucketId };
        }
        String sortOrder = MediaStore.Video.Media.DATE_MODIFIED + " DESC";

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, args, sortOrder)) {
            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(MediaStore.Video.Media._ID);
                int nameIdx = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME);
                int mimeIdx = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE);
                int sizeIdx = cursor.getColumnIndex(MediaStore.Video.Media.SIZE);
                int dateIdx = cursor.getColumnIndex(MediaStore.Video.Media.DATE_MODIFIED);
                int bucketIdIdx = cursor.getColumnIndex(MediaStore.Video.Media.BUCKET_ID);
                int bucketNameIdx = cursor.getColumnIndex(MediaStore.Video.Media.BUCKET_DISPLAY_NAME);
                int widthIdx = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH);
                int heightIdx = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT);
                int durationIdx = cursor.getColumnIndex(MediaStore.Video.Media.DURATION);
                int dataIdx = cursor.getColumnIndex(MediaStore.Video.Media.DATA);

                while (cursor.moveToNext()) {
                    Row r = new Row();
                    r.id = cursor.getLong(idIdx);
                    r.isVideo = true;
                    r.name = nameIdx != -1 ? cursor.getString(nameIdx) : null;
                    r.mimeType = mimeIdx != -1 ? cursor.getString(mimeIdx) : null;
                    r.sizeBytes = sizeIdx != -1 ? cursor.getLong(sizeIdx) : 0;
                    r.dateModifiedSec = dateIdx != -1 ? cursor.getLong(dateIdx) : 0;
                    r.bucketId = bucketIdIdx != -1 ? cursor.getString(bucketIdIdx) : null;
                    r.bucketName = bucketNameIdx != -1 ? cursor.getString(bucketNameIdx) : null;
                    r.width = widthIdx != -1 ? cursor.getInt(widthIdx) : 0;
                    r.height = heightIdx != -1 ? cursor.getInt(heightIdx) : 0;
                    r.durationMs = durationIdx != -1 ? cursor.getLong(durationIdx) : 0;
                    r.data = dataIdx != -1 ? cursor.getString(dataIdx) : null;
                    r.contentUri = ContentUris.withAppendedId(uri, r.id);
                    rows.add(r);
                }
            }
        } catch (Exception ignored) {
        }
        return rows;
    }

    // ------------------------------------------------------------------
    // ALBUMS
    // ------------------------------------------------------------------

    @PluginMethod
    public void getAlbums(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }

        try {
            List<Row> all = new ArrayList<>();
            all.addAll(queryImages(null));
            all.addAll(queryVideos(null));
            // Newest first, so each bucket's "cover" ends up being its most recent item.
            Collections.sort(all, (a, b) -> Long.compare(b.dateModifiedSec, a.dateModifiedSec));

            Map<String, JSObject> albumMap = new HashMap<>();
            Map<String, Integer> counts = new HashMap<>();

            for (Row r : all) {
                String bucketId = r.bucketId != null ? r.bucketId : "default";
                String bucketName = r.bucketName != null ? r.bucketName : "Camera";

                counts.put(bucketId, (counts.containsKey(bucketId) ? counts.get(bucketId) : 0) + 1);

                if (!albumMap.containsKey(bucketId)) {
                    String coverThumbPath = getOrCreateThumbnailPath(r.id, r.contentUri, r.isVideo);
                    JSObject alb = new JSObject();
                    alb.put("id", bucketId);
                    alb.put("name", bucketName);
                    alb.put("coverUri", coverThumbPath);
                    albumMap.put(bucketId, alb);
                }
            }

            JSArray albumsArray = new JSArray();
            for (Map.Entry<String, JSObject> entry : albumMap.entrySet()) {
                JSObject alb = entry.getValue();
                alb.put("count", counts.get(entry.getKey()));
                albumsArray.put(alb);
            }

            JSObject res = new JSObject();
            res.put("albums", albumsArray);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error querying albums: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // MEDIA
    // ------------------------------------------------------------------

    @PluginMethod
    public void getMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }

        String targetBucketId = call.getString("bucketId", null);
        int offset = call.getInt("offset", 0);
        int limit = call.getInt("limit", 1000);

        try {
            List<Row> all = new ArrayList<>();
            all.addAll(queryImages(targetBucketId));
            all.addAll(queryVideos(targetBucketId));
            Collections.sort(all, (a, b) -> Long.compare(b.dateModifiedSec, a.dateModifiedSec));

            int from = Math.max(0, Math.min(offset, all.size()));
            int to = Math.max(from, Math.min(offset + limit, all.size()));
            List<Row> page = all.subList(from, to);

            JSArray itemsArray = new JSArray();
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.US);

            for (Row r : page) {
                String finalUrl = (r.data != null && !r.data.isEmpty()) ? r.data : r.contentUri.toString();
                // Thumbnails are NOT generated here anymore -- generating a JPEG
                // for every single item during a full-library scan is what made
                // scanning slow (and, since it ran synchronously per item, also
                // what made the very first scroll feel laggy). The frontend now
                // requests each thumbnail lazily via getThumbnail() only for
                // items actually visible on screen, and the native side caches
                // each one to disk after the first request so repeat scrolls
                // are instant.

                long timestamp = r.dateModifiedSec > 0 ? r.dateModifiedSec * 1000 : System.currentTimeMillis();
                Date itemDate = new Date(timestamp);
                String dateStr = dateFormat.format(itemDate);
                String timeStr = timeFormat.format(itemDate);

                double sizeMb = Math.round((r.sizeBytes / (1024.0 * 1024.0)) * 10.0) / 10.0;
                if (sizeMb <= 0) sizeMb = 0.1;

                String name = r.name;
                if (name == null || name.isEmpty()) {
                    name = (r.isVideo ? "Video_" : "Photo_") + r.id;
                }
                String bucketName = r.bucketName;
                if (bucketName == null || bucketName.isEmpty()) {
                    bucketName = "Camera";
                }

                JSObject itemObj = new JSObject();
                itemObj.put("id", "media-" + (r.isVideo ? "v" : "p") + r.id);
                itemObj.put("mediaId", r.id);
                itemObj.put("title", name);
                itemObj.put("type", r.isVideo ? "video" : "photo");
                itemObj.put("url", finalUrl);
                itemObj.put("thumbnailUrl", "");
                itemObj.put("date", dateStr);
                itemObj.put("time", timeStr);
                itemObj.put("timestamp", timestamp);
                itemObj.put("sizeMb", sizeMb);
                itemObj.put("sizeBytes", r.sizeBytes);
                itemObj.put("album", bucketName);
                itemObj.put("mimeType", r.mimeType != null ? r.mimeType : (r.isVideo ? "video/mp4" : "image/jpeg"));
                if (r.isVideo) {
                    itemObj.put("durationSec", Math.max(1, (int) (r.durationMs / 1000)));
                }
                if (r.width > 0) itemObj.put("width", r.width);
                if (r.height > 0) itemObj.put("height", r.height);

                itemsArray.put(itemObj);
            }

            JSObject res = new JSObject();
            res.put("items", itemsArray);
            res.put("total", all.size());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error querying media: " + e.getMessage());
        }
    }

    // Generates (or returns the already-cached) thumbnail for a single item.
    // Called lazily by the frontend as each grid cell scrolls into view.
    @PluginMethod
    public void getThumbnail(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        Long mediaId = call.getLong("mediaId");
        boolean isVideo = Boolean.TRUE.equals(call.getBoolean("isVideo", false));
        if (mediaId == null) {
            call.reject("mediaId is required");
            return;
        }

        try {
            Uri collection = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            Uri contentUri = ContentUris.withAppendedId(collection, mediaId);
            String path = getOrCreateThumbnailPath(mediaId, contentUri, isVideo);

            JSObject res = new JSObject();
            res.put("path", path);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error generating thumbnail: " + e.getMessage());
        }
    }

    // Computes a real content hash (SHA-256) of a file, used to confirm exact
    // duplicates. Only called for files that already share the exact same
    // byte size (a cheap pre-filter done in JS first), so this runs on a
    // small subset of the library, not the whole thing -- keeping duplicate
    // scanning fast even though it reads real file content, not just guessed
    // metadata like size/name.
    @PluginMethod
    public void computeFileHash(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path is required");
            return;
        }
        try {
            File file = new File(path);
            if (!file.exists()) {
                call.reject("File not found");
                return;
            }
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
                byte[] buffer = new byte[65536];
                int read;
                while ((read = fis.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                }
            }
            byte[] hashBytes = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            JSObject res = new JSObject();
            res.put("hash", sb.toString());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error hashing file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getStorageStats(PluginCall call) {
        try {
            File path = Environment.getExternalStorageDirectory();
            StatFs stat = new StatFs(path.getPath());
            long blockSize = stat.getBlockSizeLong();
            long totalBlocks = stat.getBlockCountLong();
            long availableBlocks = stat.getAvailableBlocksLong();

            long totalBytes = totalBlocks * blockSize;
            long freeBytes = availableBlocks * blockSize;
            long usedBytes = Math.max(0, totalBytes - freeBytes);

            // Reuse the same reliable per-type queries used elsewhere (not the
            // generic MediaStore.Files collection, which under-reports files
            // created by other apps -- see the note at the top of this file).
            long photosBytes = 0;
            for (Row r : queryImages(null)) {
                photosBytes += r.sizeBytes;
            }
            long videosBytes = 0;
            for (Row r : queryVideos(null)) {
                videosBytes += r.sizeBytes;
            }

            long knownBytes = photosBytes + videosBytes;
            long otherBytes = Math.max(0, usedBytes - knownBytes);

            JSObject res = new JSObject();
            res.put("totalBytes", totalBytes);
            res.put("freeBytes", freeBytes);
            res.put("usedBytes", usedBytes);
            res.put("photosBytes", photosBytes);
            res.put("videosBytes", videosBytes);
            // Apps/documents aren't reliably attributable from MediaStore alone
            // without extra permissions, so everything not photos/videos is
            // reported together as "other" rather than a guessed split.
            res.put("appsBytes", 0);
            res.put("documentsBytes", 0);
            res.put("otherBytes", otherBytes);

            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error calculating storage stats: " + e.getMessage());
        }
    }

    private String getOrCreateThumbnailPath(long id, Uri contentUri, boolean isVideo) {
        try {
            Context context = getContext();
            File cacheDir = new File(context.getCacheDir(), "thumbnails");
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }

            File thumbFile = new File(cacheDir, "thumb_" + (isVideo ? "v" : "p") + id + ".jpg");
            if (thumbFile.exists() && thumbFile.length() > 0) {
                return thumbFile.getAbsolutePath();
            }

            Bitmap bitmap = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    bitmap = context.getContentResolver().loadThumbnail(contentUri, new Size(320, 320), null);
                } catch (Exception ignored) {}
            }

            if (bitmap == null) {
                if (isVideo) {
                    bitmap = MediaStore.Video.Thumbnails.getThumbnail(
                        context.getContentResolver(),
                        id,
                        MediaStore.Video.Thumbnails.MINI_KIND,
                        null
                    );
                } else {
                    bitmap = MediaStore.Images.Thumbnails.getThumbnail(
                        context.getContentResolver(),
                        id,
                        MediaStore.Images.Thumbnails.MINI_KIND,
                        null
                    );
                }
            }

            if (bitmap != null) {
                try (FileOutputStream fos = new FileOutputStream(thumbFile)) {
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, fos);
                    fos.flush();
                }
                bitmap.recycle();
                return thumbFile.getAbsolutePath();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return contentUri.toString();
    }
}

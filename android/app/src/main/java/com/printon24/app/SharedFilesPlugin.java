package com.printon24.app;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Parcelable;
import android.provider.OpenableColumns;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "SharedFiles")
public class SharedFilesPlugin extends Plugin {
    private static final long MAX_FILE_SIZE = 50L * 1024L * 1024L;
    private JSObject pendingShare;

    @PluginMethod
    public synchronized void getPendingFiles(PluginCall call) {
        JSObject result = pendingShare;
        if (result == null) {
            result = readSharedIntent(getActivity().getIntent());
        }
        pendingShare = null;
        clearActivityIntent();
        call.resolve(result == null ? emptyResult() : result);
    }

    @PluginMethod
    public synchronized void clearPendingShare(PluginCall call) {
        pendingShare = null;
        clearActivityIntent();
        call.resolve();
    }

    @PluginMethod
    public void releaseFiles(PluginCall call) {
        JSArray uris = call.getArray("uris");
        File sharedDirectory = new File(getContext().getCacheDir(), "shared-intents");
        try {
            String sharedDirectoryPath = sharedDirectory.getCanonicalPath() + File.separator;
            if (uris != null) {
                for (int index = 0; index < uris.length(); index++) {
                    Uri uri = Uri.parse(uris.getString(index));
                    if (!"file".equals(uri.getScheme())) continue;
                    File file = new File(uri.getPath());
                    String filePath = file.getCanonicalPath();
                    if (filePath.startsWith(sharedDirectoryPath)) {
                        file.delete();
                    }
                }
            }
        } catch (Exception exception) {
            call.reject("Could not clean up shared file cache.", exception);
            return;
        }
        call.resolve();
    }

    synchronized void handleNewIntent(Intent intent) {
        JSObject result = readSharedIntent(intent);
        if (result == null) return;
        pendingShare = result;
        notifyListeners("sharedFiles", result);
    }

    private JSObject readSharedIntent(Intent intent) {
        if (intent == null || intent.getAction() == null) return null;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return null;
        }

        JSArray files = new JSArray();
        JSArray errors = new JSArray();
        Set<Uri> sharedUris = new LinkedHashSet<>();
        ClipData clipData = intent.getClipData();
        if (clipData != null) {
            for (int index = 0; index < clipData.getItemCount(); index++) {
                Uri uri = clipData.getItemAt(index).getUri();
                if (uri != null) sharedUris.add(uri);
            }
        }

        if (sharedUris.isEmpty()) {
            if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                ArrayList<Parcelable> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (streams != null) {
                    for (Parcelable stream : streams) {
                        if (stream instanceof Uri) sharedUris.add((Uri) stream);
                    }
                }
            } else {
                Parcelable stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (stream instanceof Uri) sharedUris.add((Uri) stream);
            }
        }

        ContentResolver resolver = getContext().getContentResolver();
        for (Uri uri : sharedUris) {
            String fileName = getDisplayName(resolver, uri);
            String mimeType;
            try {
                mimeType = resolver.getType(uri);
            } catch (Exception exception) {
                mimeType = null;
            }
            if (mimeType == null) mimeType = intent.getType();

            if (!isSupportedFile(fileName)) {
                errors.put("Only PDF, DOC, DOCX, JPG, PNG, and WEBP files can be shared to PrintOn24.");
                continue;
            }

            try {
                File cachedFile = copyToCache(resolver, uri, fileName);
                JSObject sharedFile = new JSObject();
                sharedFile.put("name", fileName);
                sharedFile.put("mimeType", mimeType == null ? "application/octet-stream" : mimeType);
                sharedFile.put("uri", Uri.fromFile(cachedFile).toString());
                sharedFile.put("size", cachedFile.length());
                files.put(sharedFile);
            } catch (IOException exception) {
                errors.put(exception.getMessage() == null
                    ? "Could not read a shared document."
                    : exception.getMessage());
            }
        }

        JSObject result = new JSObject();
        result.put("files", files);
        result.put("errors", errors);
        clearActivityIntent();
        return result;
    }

    private File copyToCache(ContentResolver resolver, Uri uri, String fileName) throws IOException {
        File directory = new File(getContext().getCacheDir(), "shared-intents");
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IOException("Could not prepare shared document storage.");
        }

        String safeName = fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        File outputFile = new File(directory, UUID.randomUUID() + "_" + safeName);
        try (InputStream input = resolver.openInputStream(uri);
             FileOutputStream output = new FileOutputStream(outputFile)) {
            if (input == null) throw new IOException("Could not open the shared document.");
            byte[] buffer = new byte[32 * 1024];
            long copiedBytes = 0;
            int bytesRead;
            while ((bytesRead = input.read(buffer)) != -1) {
                copiedBytes += bytesRead;
                if (copiedBytes > MAX_FILE_SIZE) {
                    throw new IOException("\"" + fileName + "\" is larger than the 50 MB upload limit.");
                }
                output.write(buffer, 0, bytesRead);
            }
        } catch (IOException exception) {
            outputFile.delete();
            throw exception;
        }
        return outputFile;
    }

    private String getDisplayName(ContentResolver resolver, Uri uri) {
        try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameColumn >= 0) return cursor.getString(nameColumn);
            }
        } catch (Exception ignored) {
            // Fall back to the URI path when a provider does not expose display metadata.
        }
        String lastSegment = uri.getLastPathSegment();
        return lastSegment == null ? "shared-document" : lastSegment;
    }

    private boolean isSupportedFile(String fileName) {
        String lowerName = fileName.toLowerCase(Locale.ROOT);
        return lowerName.endsWith(".pdf")
            || lowerName.endsWith(".doc")
            || lowerName.endsWith(".docx")
            || lowerName.endsWith(".jpg")
            || lowerName.endsWith(".jpeg")
            || lowerName.endsWith(".png")
            || lowerName.endsWith(".webp");
    }

    private JSObject emptyResult() {
        JSObject result = new JSObject();
        result.put("files", new JSArray());
        result.put("errors", new JSArray());
        return result;
    }

    private void clearActivityIntent() {
        Intent launchIntent = new Intent(getActivity(), MainActivity.class);
        launchIntent.setAction(Intent.ACTION_MAIN);
        getActivity().setIntent(launchIntent);
    }
}
/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.xibanyalife.app;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    
    private static final String APP_SCHEME = "xibanyalife";
    private static final String MOMENTS_HOST = "share-moments";
    private static final String WECHAT_PACKAGE = "com.tencent.mm";
    private static final String WECHAT_TIMELINE_ACTIVITY = "com.tencent.mm.ui.tools.ShareToTimeLineUI";

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (handleNativeShareIntent(getIntent())) {
            finish();
            return;
        }
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        if (handleNativeShareIntent(intent)) {
            setIntent(intent);
            return;
        }
        super.onNewIntent(intent);
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        

        return uri;
    }

    private boolean handleNativeShareIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return false;

        Uri data = intent.getData();
        if (!APP_SCHEME.equals(data.getScheme()) || !MOMENTS_HOST.equals(data.getHost())) {
            return false;
        }

        String title = safeText(data.getQueryParameter("title"), "Espana Life");
        String url = safeText(data.getQueryParameter("url"), "");
        String text = safeText(data.getQueryParameter("text"), title);
        String shareText = text.contains(url) || url.length() == 0 ? text : text + "\n" + url;

        if (!tryShareToWeChatTimeline(title, shareText)
                && !tryShareToWeChat(title, shareText)) {
            shareWithSystemChooser(title, shareText);
        }
        return true;
    }

    private String safeText(String value, String fallback) {
        if (value == null) return fallback;
        String trimmed = value.trim();
        return trimmed.length() == 0 ? fallback : trimmed;
    }

    private boolean tryShareToWeChatTimeline(String title, String text) {
        Uri imageUri = createShareImage(title, text);
        if (imageUri == null) return false;

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_SUBJECT, title);
        intent.putExtra(Intent.EXTRA_TITLE, title);
        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.putExtra(Intent.EXTRA_STREAM, imageUri);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.setClipData(ClipData.newUri(getContentResolver(), "Espana Life", imageUri));
        intent.setComponent(new ComponentName(WECHAT_PACKAGE, WECHAT_TIMELINE_ACTIVITY));
        grantUriPermission(WECHAT_PACKAGE, imageUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return startShareIntent(intent);
    }

    private boolean tryShareToWeChat(String title, String text) {
        Intent intent = buildTextShareIntent(title, text);
        intent.setPackage(WECHAT_PACKAGE);
        return startShareIntent(intent);
    }

    private Intent buildTextShareIntent(String title, String text) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_SUBJECT, title);
        intent.putExtra(Intent.EXTRA_TITLE, title);
        intent.putExtra(Intent.EXTRA_TEXT, text);
        return intent;
    }

    private Uri createShareImage(String title, String text) {
        int width = 1080;
        int height = 1440;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        canvas.drawColor(Color.rgb(255, 248, 237));

        paint.setColor(Color.rgb(212, 43, 43));
        canvas.drawRoundRect(new RectF(54, 54, width - 54, 290), 36, 36, paint);

        paint.setColor(Color.WHITE);
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(64);
        canvas.drawText("\u897f\u73ed\u7259\u751f\u6d3b\u901a", 96, 150, paint);

        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(36);
        paint.setColor(Color.rgb(255, 228, 154));
        canvas.drawText("espanalife.app", 96, 220, paint);

        paint.setColor(Color.WHITE);
        canvas.drawRoundRect(new RectF(54, 330, width - 54, height - 90), 34, 34, paint);

        paint.setColor(Color.rgb(33, 24, 18));
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(58);
        float y = drawWrappedText(canvas, safeText(title, "\u897f\u73ed\u7259\u751f\u6d3b\u901a"), paint, 96, 430, width - 192, 74, 5);

        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        paint.setTextSize(38);
        paint.setColor(Color.rgb(88, 72, 62));
        y = drawWrappedText(canvas, safeText(text, title), paint, 96, y + 38, width - 192, 54, 12);

        paint.setColor(Color.rgb(212, 43, 43));
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextSize(42);
        canvas.drawText("https://espanalife.app", 96, height - 190, paint);

        paint.setColor(Color.rgb(122, 99, 80));
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        paint.setTextSize(30);
        canvas.drawText("Abrir en Espana Life / \u626b\u7801\u6216\u590d\u5236\u94fe\u63a5\u67e5\u770b\u8be6\u60c5", 96, height - 135, paint);

        File dir = new File(getCacheDir(), "share");
        if (!dir.exists() && !dir.mkdirs()) return null;
        File file = new File(dir, "moments-share.png");
        try (FileOutputStream out = new FileOutputStream(file)) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 92, out);
            out.flush();
            return FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
        } catch (IOException | IllegalArgumentException error) {
            return null;
        } finally {
            bitmap.recycle();
        }
    }

    private float drawWrappedText(Canvas canvas, String text, Paint paint, float x, float y, float maxWidth, float lineHeight, int maxLines) {
        if (text == null) return y;
        String clean = text.replace("\r", " ").replace("\n", " ").trim();
        StringBuilder line = new StringBuilder();
        int lines = 0;
        for (int i = 0; i < clean.length(); i++) {
            char c = clean.charAt(i);
            String next = line.toString() + c;
            if (paint.measureText(next) > maxWidth && line.length() > 0) {
                lines++;
                if (lines >= maxLines) {
                    canvas.drawText(ellipsize(line.toString(), paint, maxWidth), x, y, paint);
                    return y + lineHeight;
                }
                canvas.drawText(line.toString(), x, y, paint);
                y += lineHeight;
                line.setLength(0);
            }
            line.append(c);
        }
        if (line.length() > 0 && lines < maxLines) {
            canvas.drawText(line.toString(), x, y, paint);
            y += lineHeight;
        }
        return y;
    }

    private String ellipsize(String text, Paint paint, float maxWidth) {
        String suffix = "...";
        while (text.length() > 0 && paint.measureText(text + suffix) > maxWidth) {
            text = text.substring(0, text.length() - 1);
        }
        return text + suffix;
    }

    private boolean startShareIntent(Intent intent) {
        try {
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException error) {
            return false;
        } catch (SecurityException error) {
            return false;
        }
    }

    private void shareWithSystemChooser(String title, String text) {
        try {
            startActivity(Intent.createChooser(buildTextShareIntent(title, text), "Share"));
        } catch (Exception error) {
            Toast.makeText(this, "No share app found", Toast.LENGTH_SHORT).show();
        }
    }
}

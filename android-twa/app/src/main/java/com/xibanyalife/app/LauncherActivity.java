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
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;



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
        Intent intent = buildTextShareIntent(title, text);
        intent.setComponent(new ComponentName(WECHAT_PACKAGE, WECHAT_TIMELINE_ACTIVITY));
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

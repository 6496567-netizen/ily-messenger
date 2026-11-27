package ru.ily.messenger;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

public class MainActivity extends Activity {

    private WebView web;
    private ProgressBar progress;
    private TextView bell, avatar;
    private FrameLayout fullHolder;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;
    private SharedPreferences sp;
    private ValueCallback<Uri[]> fileCb;
    private Uri cameraUri;
    private long backAt = 0;
    private WebViewAssetLoader loader;
    private static final int REQ_FILE = 101;
    private static final String HOME = "https://appassets.androidplatform.net/assets/app/index.html";

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        sp = getSharedPreferences("ily", MODE_PRIVATE);
        buildUi();
        askPermissions();
        setupWeb();
        web.loadUrl(HOME);
        handle(getIntent());
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private TextView btn(String t) {
        TextView v = new TextView(this);
        v.setText(t); v.setTextSize(17); v.setGravity(Gravity.CENTER);
        v.setTextColor(Color.parseColor("#D4AF37"));
        v.setPadding(dp(10), 0, dp(10), 0);
        v.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.MATCH_PARENT));
        v.setClickable(true);
        return v;
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#07040F"));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setBackgroundColor(Color.parseColor("#0A0618"));
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));

        TextView title = new TextView(this);
        title.setText("  🌿 Клуб ILY");
        title.setTextColor(Color.parseColor("#D4AF37"));
        title.setTextSize(16);
        title.setGravity(Gravity.CENTER_VERTICAL);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
        title.setClickable(true);
        title.setOnClickListener(v -> js("window.ilyHome && window.ilyHome()"));

        avatar = new TextView(this);
        avatar.setText("?");
        avatar.setTextSize(15);
        avatar.setTextColor(Color.parseColor("#0B0704"));
        avatar.setGravity(Gravity.CENTER);
        avatar.setBackground(getDrawable(R.drawable.ic_stat_ily));
        avatar.setBackgroundColor(Color.parseColor("#D4AF37"));
        LinearLayout.LayoutParams ap = new LinearLayout.LayoutParams(dp(32), dp(32));
        ap.setMargins(dp(4), dp(8), dp(8), dp(8));
        avatar.setLayoutParams(ap);
        avatar.setClickable(true);
        avatar.setOnClickListener(v -> js("window.ilyProfile && window.ilyProfile()"));

        TextView home = btn("🏠");
        TextView refresh = btn("↻");
        bell = btn("🔔");
        TextView menu = btn("⋮");

        home.setOnClickListener(v -> js("window.ilyHome && window.ilyHome()"));
        refresh.setOnClickListener(v -> { web.reload(); toast("Обновляем…"); });
        bell.setOnClickListener(v -> { toggleNotify(); js("window.ilyNotifyState && window.ilyNotifyState()"); });
        menu.setOnClickListener(this::menu);

        bar.addView(title);
        bar.addView(home);
        bar.addView(refresh);
        bar.addView(bell);
        bar.addView(menu);
        bar.addView(avatar);

        FrameLayout holder = new FrameLayout(this);
        holder.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        web = new WebView(this);
        web.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(Color.parseColor("#07040F"));
        fullHolder = new FrameLayout(this);
        fullHolder.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        fullHolder.setBackgroundColor(Color.BLACK);
        fullHolder.setVisibility(View.GONE);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        progress.setMax(100);
        progress.setVisibility(View.GONE);
        holder.addView(web); holder.addView(fullHolder); holder.addView(progress);
        root.addView(bar); root.addView(holder);
        setContentView(root);
        paintBell();
    }

    private void menu(View anchor) {
        PopupMenu p = new PopupMenu(this, anchor);
        p.getMenu().add(0, 1, 0, "🏠 Домой");
        p.getMenu().add(0, 2, 1, "💬 Чаты");
        p.getMenu().add(0, 3, 2, "📱 Телефонная книга");
        p.getMenu().add(0, 4, 3, "📰 Лента клуба");
        p.getMenu().add(0, 5, 4, "👤 Профиль");
        p.getMenu().add(0, 6, 5, notifyOn() ? "🔕 Выключить уведомления" : "🔔 Включить уведомления");
        p.getMenu().add(0, 7, 6, "🔋 Экономный режим: " + (saver() ? "ВКЛ" : "ВЫКЛ"));
        p.getMenu().add(0, 8, 7, "🌗 Тема: светлая / тёмная");
        p.getMenu().add(0, 9, 8, "📤 Пригласить друга");
        p.getMenu().add(0, 10, 9, "🧹 Очистить кэш");
        p.getMenu().add(0, 11, 10, "🚪 Выйти из аккаунта");
        p.getMenu().add(0, 12, 11, "ℹ️ О приложении");
        p.setOnMenuItemClickListener(it -> {
            switch (it.getItemId()) {
                case 1: js("window.ilyHome && window.ilyHome()"); return true;
                case 2: js("window.ilyTab && window.ilyTab('chats')"); return true;
                case 3: js("window.ilyTab && window.ilyTab('contacts')"); return true;
                case 4: js("window.ilyTab && window.ilyTab('feed')"); return true;
                case 5: js("window.ilyProfile && window.ilyProfile()"); return true;
                case 6: toggleNotify(); return true;
                case 7: sp.edit().putBoolean("saver", !saver()).apply(); PollService.restart(this);
                    toast(saver() ? "Экономный режим включён" : "Экономный режим выключен"); return true;
                case 8: js("window.ilyTheme && window.ilyTheme()"); return true;
                case 9: js("window.ilyInvite && window.ilyInvite()"); return true;
                case 10: web.clearCache(true); web.reload(); toast("Кэш очищен"); return true;
                case 11: sp.edit().remove("token").remove("uid").remove("msg_id").putLong("last_notif", 0).apply();
                    js("window.ilyLogout && window.ilyLogout()"); PollService.badge(this, 0); return true;
                case 12: new AlertDialog.Builder(this).setTitle("🌿 Клуб ILY · приложение 3.0")
                    .setMessage("Автономное приложение клуба. Интерфейс встроен в приложение и работает без браузера и без SSL-сертификата сайта. Связь с клубом, книга контактов, звонки, уведомления и счётчик на иконке выполняются самим приложением.")
                    .setPositiveButton("Понятно", null).show(); return true;
            }
            return false;
        });
        p.show();
    }

    private boolean notifyOn() { return sp.getBoolean("notify", true); }
    private boolean saver() { return sp.getBoolean("saver", false); }
    private void paintBell() { bell.setText(notifyOn() ? "🔔" : "🔕"); bell.setAlpha(notifyOn() ? 1f : .5f); }
    private void toggleNotify() {
        sp.edit().putBoolean("notify", !notifyOn()).apply();
        paintBell();
        if (notifyOn()) { askPermissions(); PollService.start(this); toast("🔔 Уведомления включены"); }
        else { PollService.stop(this); PollService.badge(this, 0); toast("🔕 Уведомления выключены"); }
    }

    private void askPermissions() {
        ArrayList<String> need = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED)
            need.add("android.permission.POST_NOTIFICATIONS");
        if (checkSelfPermission(android.Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED)
            need.add(android.Manifest.permission.READ_CONTACTS);
        if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
            need.add(android.Manifest.permission.CAMERA);
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
            need.add(android.Manifest.permission.RECORD_AUDIO);
        if (!need.isEmpty()) requestPermissions(need.toArray(new String[0]), 7);
        else if (notifyOn()) PollService.start(this);
    }

    @Override public void onRequestPermissionsResult(int c, String[] p, int[] r) {
        super.onRequestPermissionsResult(c, p, r);
        if (notifyOn()) PollService.start(this);
    }

    private void setupWeb() {
        loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " ILYApp/3.0");
        CookieManager.getInstance().setAcceptCookie(true);
        web.addJavascriptInterface(new Bridge(), "ILY");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                if (u.indexOf("appassets.androidplatform.net") >= 0) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Throwable ignored) {}
                return true;
            }
            @Override public void onPageFinished(WebView v, String u) {
                progress.setVisibility(View.GONE);
                js("window.ilyNativeReady && window.ilyNativeReady()");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v, int p) {
                progress.setVisibility(p < 100 ? View.VISIBLE : View.GONE); progress.setProgress(p);
            }
            @Override public void onPermissionRequest(final PermissionRequest rq) {
                runOnUiThread(() -> { try { rq.grant(rq.getResources()); } catch (Throwable ignored) {} });
            }
            @Override public void onShowCustomView(View v, CustomViewCallback cb) {
                customView = v; customCb = cb; fullHolder.addView(v); fullHolder.setVisibility(View.VISIBLE);
            }
            @Override public void onHideCustomView() {
                if (customView != null) { fullHolder.removeView(customView); customView = null; }
                fullHolder.setVisibility(View.GONE);
                if (customCb != null) { customCb.onCustomViewHidden(); customCb = null; }
            }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams pr) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cameraUri = null;
                try {
                    File dir = new File(getExternalCacheDir(), "shots");
                    if (!dir.exists()) dir.mkdirs();
                    File f = new File(dir, "ily_" + System.currentTimeMillis() + ".jpg");
                    cameraUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fp", f);
                    cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                    cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                } catch (Throwable t) { cameraUri = null; }
                Intent ch = Intent.createChooser(pick, "Прикрепить файл");
                if (cameraUri != null) ch.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
                try { startActivityForResult(ch, REQ_FILE); }
                catch (Throwable t) { fileCb.onReceiveValue(null); fileCb = null; }
                return true;
            }
        });
        web.setDownloadListener((u, ua, cd, mime, len) -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); }
            catch (Throwable t) { toast("Не удалось открыть файл"); }
        });
    }

    private void js(String code) { runOnUiThread(() -> { try { web.evaluateJavascript(code, null); } catch (Throwable ignored) {} }); }
    private void toast(String m) { runOnUiThread(() -> Toast.makeText(this, m, Toast.LENGTH_SHORT).show()); }

    @Override protected void onActivityResult(int c, int r, Intent d) {
        super.onActivityResult(c, r, d);
        if (c != REQ_FILE || fileCb == null) return;
        Uri[] out = null;
        if (r == RESULT_OK) {
            if (d != null && d.getData() != null) out = new Uri[]{d.getData()};
            else if (d != null && d.getClipData() != null) {
                int n = d.getClipData().getItemCount(); out = new Uri[n];
                for (int i = 0; i < n; i++) out[i] = d.getClipData().getItemAt(i).getUri();
            } else if (cameraUri != null) out = new Uri[]{cameraUri};
        }
        fileCb.onReceiveValue(out); fileCb = null; cameraUri = null;
    }

    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); handle(i); }
    @Override protected void onResume() { super.onResume(); handle(getIntent()); if (notifyOn()) PollService.start(this); }

    private void handle(Intent i) {
        if (i == null) return;
        String hash = i.getStringExtra("hash");
        if (hash != null && hash.length() > 0) {
            final String h = hash.replace("'", "");
            js("window.ilyRoute && window.ilyRoute('" + h + "')");
            i.removeExtra("hash");
        }
    }

    @Override public void onBackPressed() {
        if (customView != null) {
            if (customCb != null) { customCb.onCustomViewHidden(); customCb = null; }
            fullHolder.removeAllViews(); fullHolder.setVisibility(View.GONE); customView = null; return;
        }
        if (web.canGoBack()) { web.goBack(); return; }
        if (System.currentTimeMillis() - backAt < 2000) { super.onBackPressed(); return; }
        backAt = System.currentTimeMillis(); toast("Нажмите ещё раз, чтобы выйти");
    }

    /* ================= МОСТ ПРИЛОЖЕНИЯ ================= */
    private class Bridge {

        @JavascriptInterface public void call(final String id, final String action, final String params) {
            new Thread(() -> {
                String res;
                try {
                    JSONObject p = new JSONObject(params == null || params.length() == 0 ? "{}" : params);
                    String tok = sp.getString("token", "");
                    String uid = sp.getString("uid", "");
                    res = Net.post(Net.entryFor(action), action, p, tok, uid);
                } catch (Throwable t) { res = Net.err("Ошибка запроса: " + t.getMessage()); }
                final String out = res;
                js("window.__ilyResolve('" + id + "'," + out + ")");
            }).start();
        }

        @JavascriptInterface public void session(String token, String uid, String name, String avatarUrl) {
            sp.edit().putString("token", token == null ? "" : token)
                    .putString("uid", uid == null ? "" : uid)
                    .putString("name", name == null ? "" : name).apply();
            final String letter = (name == null || name.length() == 0) ? "?" : name.substring(0, 1).toUpperCase();
            runOnUiThread(() -> avatar.setText(letter));
            if (avatarUrl != null && avatarUrl.length() > 4) loadAvatar(avatarUrl);
            if (notifyOn()) PollService.start(MainActivity.this);
        }

        @JavascriptInterface public String state() {
            JSONObject o = new JSONObject();
            try {
                o.put("token", sp.getString("token", ""));
                o.put("uid", sp.getString("uid", ""));
                o.put("name", sp.getString("name", ""));
                o.put("notify", notifyOn());
                o.put("saver", saver());
                o.put("theme", sp.getString("theme", "night"));
                o.put("version", "3.0");
            } catch (Throwable ignored) {}
            return o.toString();
        }

        @JavascriptInterface public void theme(String mode) { sp.edit().putString("theme", mode).apply(); }

        @JavascriptInterface public String contacts() {
            JSONArray arr = new JSONArray();
            if (checkSelfPermission(android.Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                askPermissions();
                return errJson("Разрешите доступ к контактам в настройках приложения");
            }
            try {
                Cursor c = getContentResolver().query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                        new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                                ContactsContract.CommonDataKinds.Phone.NUMBER}, null, null,
                        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC");
                if (c != null) {
                    while (c.moveToNext()) {
                        String n = c.getString(0), p = c.getString(1);
                        if (p == null) continue;
                        String digits = p.replaceAll("[^0-9]", "");
                        if (digits.length() < 7) continue;
                        JSONObject o = new JSONObject();
                        o.put("name", n == null ? "" : n);
                        o.put("phone", "+" + digits);
                        arr.put(o);
                        if (arr.length() >= 2000) break;
                    }
                    c.close();
                }
                JSONObject ok = new JSONObject();
                ok.put("success", true); ok.put("items", arr);
                return ok.toString();
            } catch (Throwable t) { return errJson("Не удалось прочитать книгу: " + t.getMessage()); }
        }

        @JavascriptInterface public void share(String title, String text, String url) {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_SUBJECT, title == null ? "Клуб ILY" : title);
                    i.putExtra(Intent.EXTRA_TEXT, (text == null ? "" : text) + " " + (url == null ? "" : url));
                    startActivity(Intent.createChooser(i, "Поделиться через…"));
                } catch (Throwable t) { toast("Не удалось открыть список приложений"); }
            });
        }

        @JavascriptInterface public void invite(String phone, String text, String url) {
            runOnUiThread(() -> {
                try {
                    Intent sms = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + (phone == null ? "" : phone)));
                    sms.putExtra("sms_body", (text == null ? "" : text) + " " + (url == null ? "" : url));
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType("text/plain");
                    send.putExtra(Intent.EXTRA_TEXT, (text == null ? "" : text) + " " + (url == null ? "" : url));
                    Intent ch = Intent.createChooser(send, "Пригласить через…");
                    ch.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{sms});
                    startActivity(ch);
                } catch (Throwable t) { toast("Не удалось открыть приглашение"); }
            });
        }

        @JavascriptInterface public void open(String url) {
            runOnUiThread(() -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Throwable ignored) {} });
        }

        @JavascriptInterface public void dial(String number) {
            runOnUiThread(() -> { try { startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + number))); } catch (Throwable ignored) {} });
        }

        @JavascriptInterface public void badge(int n) { PollService.badge(MainActivity.this, n); }

        @JavascriptInterface public void notify(String title, String body, String hash) {
            PollService.show(MainActivity.this, "ily_messages", 9, title, body, hash, false);
        }

        @JavascriptInterface public void toast(String m) { MainActivity.this.toast(m); }

        @JavascriptInterface public void ring(boolean on) { PollService.ring(MainActivity.this, on); }

        @JavascriptInterface public void exit() { runOnUiThread(() -> finish()); }

        private String errJson(String m) {
            JSONObject o = new JSONObject();
            try { o.put("success", false); o.put("message", m); } catch (Throwable ignored) {}
            return o.toString();
        }
    }

    private void loadAvatar(final String url) {
        new Thread(() -> {
            try {
                String u = url.indexOf("http") == 0 ? url : Net.BASE + url.replaceFirst("^/+", "");
                HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
                c.setConnectTimeout(10000); c.setReadTimeout(15000);
                InputStream in = c.getInputStream();
                final Bitmap bm = BitmapFactory.decodeStream(in);
                in.close(); c.disconnect();
                if (bm != null) runOnUiThread(() -> {
                    avatar.setText("");
                    avatar.setBackground(new android.graphics.drawable.BitmapDrawable(getResources(), bm));
                });
            } catch (Throwable ignored) {}
        }).start();
    }
}

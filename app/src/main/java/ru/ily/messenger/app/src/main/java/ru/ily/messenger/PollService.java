package ru.ily.messenger;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;

public class PollService extends Service {

    private HandlerThread th;
    private Handler h;
    private SharedPreferences sp;
    private PowerManager.WakeLock wl;
    private int prev = -1, tick = 0;
    private boolean started = false;
    private final HashSet<String> seenCalls = new HashSet<>();
    private static Vibrator vib;

    private final Runnable loop = new Runnable() {
        @Override public void run() {
            try { poll(); } catch (Throwable ignored) {}
            if (h != null) h.postDelayed(this, sp.getBoolean("saver", false) ? 120000L : 25000L);
        }
    };

    public static void start(Context c) {
        try {
            Intent i = new Intent(c, PollService.class);
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
        } catch (Throwable ignored) {}
    }
    public static void stop(Context c) { try { c.stopService(new Intent(c, PollService.class)); } catch (Throwable ignored) {} }
    public static void restart(Context c) { stop(c); start(c); }

    @Override public void onCreate() {
        super.onCreate();
        sp = getSharedPreferences("ily", MODE_PRIVATE);
        channels(this);
        th = new HandlerThread("ily-poll"); th.start();
        h = new Handler(th.getLooper());
    }

    @Override public int onStartCommand(Intent i, int f, int id) {
        if (!sp.getBoolean("notify", true)) { stopSelf(); return START_NOT_STICKY; }
        try { startForeground(1, ongoing(this)); } catch (Throwable t) { stopSelf(); return START_NOT_STICKY; }
        if (!started) { started = true; wake(); h.post(loop); }
        return START_STICKY;
    }

    private void wake() {
        release();
        if (sp.getBoolean("saver", false)) return;
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ily:poll");
            wl.setReferenceCounted(false); wl.acquire();
        } catch (Throwable ignored) {}
    }
    private void release() { try { if (wl != null && wl.isHeld()) wl.release(); } catch (Throwable ignored) {} wl = null; }

    public static void channels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(NOTIFICATION_SERVICE);
        NotificationChannel s = new NotificationChannel("ily_service", "Работа приложения", NotificationManager.IMPORTANCE_MIN);
        s.setShowBadge(false); s.setSound(null, null); s.enableVibration(false);
        nm.createNotificationChannel(s);
        NotificationChannel m = new NotificationChannel("ily_messages", "Сообщения и события", NotificationManager.IMPORTANCE_HIGH);
        m.enableLights(true); m.setLightColor(Color.parseColor("#D4AF37")); m.enableVibration(true);
        nm.createNotificationChannel(m);
        NotificationChannel k = new NotificationChannel("ily_calls", "Входящие звонки", NotificationManager.IMPORTANCE_HIGH);
        k.enableVibration(true); k.setVibrationPattern(new long[]{0, 700, 350, 700}); k.setBypassDnd(true);
        nm.createNotificationChannel(k);
    }

    private Notification ongoing(Context c) {
        PendingIntent pi = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, "ily_service") : new Notification.Builder(c);
        return b.setContentTitle("🌿 Клуб ILY на связи")
                .setContentText(sp.getBoolean("saver", false) ? "Экономный режим · раз в 2 минуты" : "Автономные уведомления включены")
                .setSmallIcon(R.drawable.ic_stat_ily).setColor(Color.parseColor("#D4AF37"))
                .setOngoing(true).setShowWhen(false).setContentIntent(pi).build();
    }

    private void poll() {
        String tok = sp.getString("token", "");
        if (tok.length() < 8) return;
        String uid = sp.getString("uid", "");

        String raw = Net.post(Net.API, "messenger_badges", new JSONObject(), tok, uid);
        try {
            JSONObject j = new JSONObject(raw);
            if (j.optBoolean("success", false)) {
                int n = j.getJSONObject("data").optInt("unread", 0);
                badge(this, n);
                if (prev >= 0 && n > prev) notifyMessage(tok, uid);
                prev = n;
            }
        } catch (Throwable ignored) {}

        String mid = sp.getString("msg_id", "");
        if (mid.length() == 0) {
            try {
                JSONObject cfg = new JSONObject(Net.post(Net.API, "messenger_config", new JSONObject(), tok, uid));
                if (cfg.optBoolean("success", false)) {
                    JSONObject me = cfg.getJSONObject("data").optJSONObject("me");
                    if (me != null) { mid = String.valueOf(me.optInt("id", 0)); sp.edit().putString("msg_id", mid).apply(); }
                }
            } catch (Throwable ignored) {}
        }
        if (mid.length() > 0 && !"0".equals(mid)) calls(tok, uid, mid);

        tick++;
        if (tick % 2 == 0) events(tok, uid);
    }

    private void notifyMessage(String tok, String uid) {
        String title = "💬 Клуб ILY", text = "Новое сообщение", hash = "";
        try {
            JSONObject j = new JSONObject(Net.post(Net.API, "messenger_dialogs", new JSONObject(), tok, uid));
            JSONArray a = j.optJSONArray("data");
            if (a != null) for (int i = 0; i < a.length(); i++) {
                JSONObject d = a.getJSONObject(i);
                if (d.optInt("unread", 0) > 0) {
                    title = "💬 " + d.optString("title", "Клуб ILY");
                    String lt = d.optString("last_text", "");
                    text = lt.length() > 0 ? lt : "Новое сообщение";
                    hash = "chat=" + d.optInt("id", 0);
                    break;
                }
            }
        } catch (Throwable ignored) {}
        show(this, "ily_messages", 2, title, text, hash, false);
    }

    private void calls(String tok, String uid, String mid) {
        try {
            JSONObject j = new JSONObject(Net.post(Net.API, "messenger_calls_log", new JSONObject(), tok, uid));
            JSONArray a = j.optJSONArray("data");
            if (a == null) return;
            for (int i = 0; i < a.length(); i++) {
                JSONObject c = a.getJSONObject(i);
                if (!"ringing".equals(c.optString("status"))) continue;
                if (!mid.equals(String.valueOf(c.optInt("callee_id", 0)))) continue;
                String id = c.optString("call_id", "");
                if (id.length() == 0 || seenCalls.contains(id)) continue;
                seenCalls.add(id);
                boolean video = "video".equals(c.optString("media", "audio"));
                show(this, "ily_calls", 3, video ? "📹 Видеозвонок клуба" : "📞 Аудиозвонок клуба",
                        "Вам звонят — нажмите, чтобы ответить", "call=" + id, true);
            }
            if (seenCalls.size() > 300) seenCalls.clear();
        } catch (Throwable ignored) {}
    }

    private void events(String tok, String uid) {
        try {
            JSONObject p = new JSONObject(); p.put("limit", 25);
            JSONObject j = new JSONObject(Net.post(Net.CLUB, "get_user_notifications", p, tok, uid));
            if (!j.optBoolean("success", false)) return;
            JSONArray a = j.optJSONArray("data");
            if (a == null || a.length() == 0) return;
            long last = sp.getLong("last_notif", 0), max = last;
            ArrayList<JSONObject> fresh = new ArrayList<>();
            for (int i = 0; i < a.length(); i++) {
                JSONObject n = a.getJSONObject(i);
                long id = n.optLong("id", 0);
                if (id > max) max = id;
                if (id > last) fresh.add(n);
            }
            if (last == 0) { sp.edit().putLong("last_notif", max).apply(); return; }
            if (max > last) sp.edit().putLong("last_notif", max).apply();
            for (int i = fresh.size() - 1; i >= 0; i--) {
                JSONObject n = fresh.get(i);
                String type = n.optString("type", "");
                if (type.indexOf("chat_") == 0 || type.equals("message")) continue;
                JSONObject d = n.optJSONObject("data");
                String hash = "";
                if (d != null) {
                    if (d.optInt("chat_id", 0) > 0) hash = "chat=" + d.optInt("chat_id", 0);
                    else if (d.optInt("post_id", 0) > 0) hash = "feed";
                }
                show(this, "ily_messages", 4, n.optString("title", "🌿 Клуб ILY"),
                        n.optString("message", "Новое событие в клубе"), hash, false);
            }
        } catch (Throwable ignored) {}
    }

    public static void show(Context c, String ch, int kind, String title, String body, String hash, boolean call) {
        channels(c);
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (hash != null && hash.length() > 0) i.putExtra("hash", hash);
        int req = kind * 1000 + (int) (System.currentTimeMillis() % 1000);
        PendingIntent pi = PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, ch) : new Notification.Builder(c);
        b.setContentTitle(title).setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setSmallIcon(R.drawable.ic_stat_ily).setColor(Color.parseColor("#D4AF37"))
                .setAutoCancel(true).setContentIntent(pi).setNumber(1);
        if (call) {
            b.setCategory(Notification.CATEGORY_CALL).setFullScreenIntent(pi, true).setOngoing(true);
            b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
            ring(c, true);
        } else {
            b.setCategory(Notification.CATEGORY_MESSAGE);
        }
        NotificationManager nm = (NotificationManager) c.getSystemService(NOTIFICATION_SERVICE);
        try { nm.notify(req, b.build()); } catch (Throwable ignored) {}
    }

    public static void ring(Context c, boolean on) {
        try {
            if (vib == null) vib = (Vibrator) c.getSystemService(VIBRATOR_SERVICE);
            if (vib == null) return;
            if (on) vib.vibrate(new long[]{0, 700, 350, 700, 350, 900}, -1);
            else vib.cancel();
        } catch (Throwable ignored) {}
    }

    public static void badge(Context c, int n) {
        SharedPreferences s = c.getSharedPreferences("ily", MODE_PRIVATE);
        s.edit().putInt("badge", n).apply();
        String pkg = c.getPackageName();
        String cls = pkg + ".MainActivity";
        try {
            Intent i = new Intent("android.intent.action.BADGE_COUNT_UPDATE");
            i.putExtra("badge_count", n); i.putExtra("badge_count_package_name", pkg);
            i.putExtra("badge_count_class_name", cls); c.sendBroadcast(i);
        } catch (Throwable ignored) {}
        try {
            Intent i = new Intent("com.sonyericsson.home.action.UPDATE_BADGE");
            i.putExtra("com.sonyericsson.home.intent.extra.badge.ACTIVITY_NAME", cls);
            i.putExtra("com.sonyericsson.home.intent.extra.badge.SHOW_MESSAGE", n > 0);
            i.putExtra("com.sonyericsson.home.intent.extra.badge.MESSAGE", String.valueOf(n));
            i.putExtra("com.sonyericsson.home.intent.extra.badge.PACKAGE_NAME", pkg);
            c.sendBroadcast(i);
        } catch (Throwable ignored) {}
        try {
            Intent i = new Intent("com.huawei.android.launcher.action.CHANGE_APPLICATION_NOTIFICATION_NUM");
            i.putExtra("packageName", pkg); i.putExtra("className", cls); i.putExtra("notificationNum", n);
            c.sendBroadcast(i);
        } catch (Throwable ignored) {}
        try {
            Intent i = new Intent("miui.intent.action.APP_BADGE_COUNT_UPDATE");
            i.putExtra("package", pkg); i.putExtra("class", cls); i.putExtra("count", n);
            c.sendBroadcast(i);
        } catch (Throwable ignored) {}
        try {
            Intent i = new Intent("android.intent.action.APPLICATION_MESSAGE_UPDATE");
            i.putExtra("android.intent.extra.update_application_component_name", pkg + "/" + cls);
            i.putExtra("android.intent.extra.update_application_message_text", n > 0 ? String.valueOf(n) : "");
            c.sendBroadcast(i);
        } catch (Throwable ignored) {}
    }

    @Override public void onDestroy() {
        if (h != null) h.removeCallbacks(loop);
        release(); ring(this, false);
        if (th != null) th.quitSafely();
        started = false;
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent i) { return null; }

    public static class BootReceiver extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent i) {
            SharedPreferences s = c.getSharedPreferences("ily", Context.MODE_PRIVATE);
            if (s.getBoolean("notify", true) && s.getString("token", "").length() > 8) start(c);
        }
    }
}

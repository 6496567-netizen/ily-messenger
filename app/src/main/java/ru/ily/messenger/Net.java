package ru.ily.messenger;

import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Iterator;

public class Net {

    public static String BASE = "http://ily-magic.ru/";
    public static String API = BASE + "api-messenger.php";
    public static String APP = BASE + "api-messenger-app.php";
    public static String CLUB = BASE + "api.php";

    public static String entryFor(String action) {
        if (action.indexOf("mapp_") == 0) return APP;
        if (action.indexOf("messenger_") == 0 || action.indexOf("msg_") == 0) return API;
        return CLUB;
    }

    public static String post(String url, String action, JSONObject params, String token, String uid) {
        StringBuilder body = new StringBuilder();
        try {
            body.append("action=").append(URLEncoder.encode(action, "UTF-8"));
            if (token != null && token.length() > 0) body.append("&token=").append(URLEncoder.encode(token, "UTF-8"));
            if (uid != null && uid.length() > 0) body.append("&user_id=").append(URLEncoder.encode(uid, "UTF-8"));
            if (params != null) {
                Iterator<String> it = params.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    Object v = params.get(k);
                    String s = (v instanceof JSONObject || v instanceof org.json.JSONArray) ? v.toString() : String.valueOf(v);
                    body.append('&').append(URLEncoder.encode(k, "UTF-8")).append('=').append(URLEncoder.encode(s, "UTF-8"));
                }
            }
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestMethod("POST");
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            c.setRequestProperty("User-Agent", "ILYApp/3.0 (Android; autonomous)");
            OutputStream os = c.getOutputStream();
            os.write(body.toString().getBytes("UTF-8"));
            os.flush();
            os.close();
            BufferedReader r = new BufferedReader(new InputStreamReader(
                    c.getResponseCode() >= 400 ? c.getErrorStream() : c.getInputStream(), "UTF-8"));
            StringBuilder out = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) out.append(line);
            r.close();
            c.disconnect();
            String txt = out.toString().trim();
            if (txt.length() == 0) return err("Пустой ответ сервера");
            if (txt.charAt(0) != '{' && txt.charAt(0) != '[') return err("Сервер вернул не JSON");
            return txt;
        } catch (Throwable t) {
            return err("Нет связи с клубом: " + t.getMessage());
        }
    }

    public static String err(String m) {
        JSONObject o = new JSONObject();
        try { o.put("success", false); o.put("message", m); } catch (Throwable ignored) {}
        return o.toString();
    }
}

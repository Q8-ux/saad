package com.q8ux.antalshaer;

import java.net.URI;
import java.text.Normalizer;
import java.util.Locale;

/** Pure policy shared by the activity and JVM checks. No secrets or manuscript data. */
public final class BrowserPolicy {
    public static final String ORIGIN = "https://q8-ux.github.io";
    public static final String ROOT_PATH = "/saad/ant-alshaer/";
    public static final String START_URL = ORIGIN + ROOT_PATH + "?app=android&v=1";
    public static final long MAX_EXPORT_BYTES = 128L * 1024 * 1024;
    private BrowserPolicy() {}
    public static boolean isTrustedOrigin(String value) {
        try {
            URI u = new URI(value);
            return "https".equalsIgnoreCase(u.getScheme()) && "q8-ux.github.io".equalsIgnoreCase(u.getHost())
                && u.getUserInfo() == null && (u.getPort() == -1 || u.getPort() == 443);
        } catch (Exception ignored) { return false; }
    }
    public static boolean isAppUrl(String value) {
        try {
            if (!isTrustedOrigin(value) || value.indexOf('\\') >= 0) return false;
            URI u = new URI(value);
            if (u.getRawPath() != null && u.getRawPath().toLowerCase(Locale.ROOT).matches(".*%(25|2f|5c).*")) return false;
            String path = u.getPath();
            if (path == null || path.indexOf('\\') >= 0 || path.chars().anyMatch(c -> c < 32)) return false;
            String normalized = new URI(null, null, path, null).normalize().getPath();
            return path.startsWith(ROOT_PATH) && normalized.startsWith(ROOT_PATH);
        } catch (Exception ignored) { return false; }
    }
    public static String safeFilename(String value) {
        String name = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFC)
            .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").replaceAll("^\\.+", "").trim();
        if (name.isEmpty()) name = "ant-alshaer-export";
        if (name.codePointCount(0, name.length()) > 120) name = name.substring(0, name.offsetByCodePoints(0, 120));
        return name;
    }
    public static String safeMime(String value) {
        String type = value == null ? "" : value.toLowerCase(Locale.ROOT).split(";", 2)[0].trim();
        return switch (type) {
            case "application/json", "text/plain", "text/csv", "image/png", "image/jpeg", "image/webp", "image/svg+xml",
                "audio/mpeg", "audio/mp4", "audio/wav", "application/pdf", "application/zip",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> type;
            default -> "application/octet-stream";
        };
    }
    public static boolean validExportSize(long size) { return size >= 0 && size <= MAX_EXPORT_BYTES; }
}

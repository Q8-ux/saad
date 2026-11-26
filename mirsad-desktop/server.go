package main

import (
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync/atomic"
	"time"
)

//go:embed web/*
var assets embed.FS

type LocalServer struct {
	app               *App
	host, token, csrf string
	lastHeartbeat     atomic.Int64
	server            *http.Server
}

func randomToken() string {
	b := make([]byte, 32)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b)
}
func tokenEqual(a, b string) bool {
	return len(a) == len(b) && subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
func newLocalServer(a *App, host string) *LocalServer {
	s := &LocalServer{app: a, host: host, token: randomToken(), csrf: randomToken()}
	s.lastHeartbeat.Store(time.Now().Unix())
	return s
}
func (s *LocalServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
	if r.Host != s.host {
		http.Error(w, "عنوان طلب غير مقبول", http.StatusForbidden)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/start/") {
		if r.Method != "GET" || !tokenEqual(strings.TrimPrefix(r.URL.Path, "/start/"), s.token) {
			http.Error(w, "جلسة غير صالحة", 403)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: "mirsad_session", Value: s.token, Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode})
		s.lastHeartbeat.Store(time.Now().Unix())
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	c, e := r.Cookie("mirsad_session")
	if e != nil || !tokenEqual(c.Value, s.token) {
		http.Error(w, "افتح مرصد من ملف البرنامج لبدء جلسة محلية", 401)
		return
	}
	if r.Method != "GET" && r.Method != "HEAD" {
		if r.Method != "POST" || r.Header.Get("Origin") != "http://"+s.host || !tokenEqual(r.Header.Get("X-Mirsad-CSRF"), s.csrf) {
			http.Error(w, "طلب غير مصرح", 403)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 4096)
	}
	switch r.URL.Path {
	case "/":
		if r.Method != "GET" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		serveAsset(w, r, "index.html")
	case "/app.css":
		serveAsset(w, r, "app.css")
	case "/app.js":
		serveAsset(w, r, "app.js")
	case "/icon.svg":
		serveAsset(w, r, "icon.svg")
	case "/api/state":
		writeJSON(w, s.app.State())
	case "/api/config":
		writeJSON(w, map[string]any{"csrf": s.csrf, "version": version, "platform": platformName(), "installPath": installPath()})
	case "/api/heartbeat":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		s.lastHeartbeat.Store(time.Now().Unix())
		writeJSON(w, map[string]bool{"ok": true})
	case "/api/scan":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		var input struct {
			Section string `json:"section"`
			Active  bool   `json:"active"`
		}
		if json.NewDecoder(r.Body).Decode(&input) != nil {
			http.Error(w, "بيانات غير صحيحة", 400)
			return
		}
		if input.Section == "all" {
			for _, id := range sectionOrder {
				s.app.Start(id, false)
			}
			writeJSON(w, map[string]bool{"started": true})
			return
		}
		if _, ok := sectionNames[input.Section]; !ok {
			http.Error(w, "فحص غير معروف", 400)
			return
		}
		writeJSON(w, map[string]bool{"started": s.app.Start(input.Section, input.Active)})
	case "/api/stop":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		s.app.Stop()
		writeJSON(w, map[string]bool{"ok": true})
	case "/api/install":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		if e := installApp(); e != nil {
			http.Error(w, e.Error(), 500)
			return
		}
		s.app.mu.Lock()
		s.app.state.Installing = false
		s.app.state.Installed = true
		s.app.logLocked("اكتمل تثبيت البرنامج لهذا المستخدم", "success")
		s.app.mu.Unlock()
		writeJSON(w, map[string]bool{"ok": true})
	case "/api/portable":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		s.app.mu.Lock()
		s.app.state.Installing = false
		s.app.mu.Unlock()
		writeJSON(w, map[string]bool{"ok": true})
	case "/api/settings":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		var input struct {
			Page string `json:"page"`
		}
		if json.NewDecoder(r.Body).Decode(&input) != nil {
			http.Error(w, "بيانات غير صحيحة", 400)
			return
		}
		if e := openSettings(input.Page); e != nil {
			http.Error(w, e.Error(), 400)
			return
		}
		writeJSON(w, map[string]bool{"ok": true})
	case "/api/save":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		name := "scan-" + time.Now().Format("20060102-150405") + "-" + randomToken()[:6] + ".json"
		b, e := json.MarshalIndent(s.app.State(), "", "  ")
		if e == nil {
			e = os.MkdirAll(filepath.Join(s.app.dataDir, "Sessions"), 0700)
		}
		if e == nil {
			e = os.WriteFile(filepath.Join(s.app.dataDir, "Sessions", name), b, 0600)
		}
		if e != nil {
			http.Error(w, "تعذر حفظ الفحص محليًا", 500)
			return
		}
		pruneSessions(filepath.Join(s.app.dataDir, "Sessions"))
		writeJSON(w, map[string]string{"name": name})
	case "/api/sessions":
		files, _ := filepath.Glob(filepath.Join(s.app.dataDir, "Sessions", "scan-*.json"))
		sort.Sort(sort.Reverse(sort.StringSlice(files)))
		rows := []map[string]string{}
		for _, p := range files {
			rows = append(rows, map[string]string{"name": filepath.Base(p)})
		}
		writeJSON(w, rows)
	case "/api/session":
		name := r.URL.Query().Get("name")
		if !validSessionName(name) {
			http.Error(w, "اسم غير صالح", 400)
			return
		}
		p := filepath.Join(s.app.dataDir, "Sessions", name)
		if _, e := os.Stat(p); e != nil {
			http.Error(w, "الفحص غير موجود", 404)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
		http.ServeFile(w, r, p)
	case "/api/export":
		s.export(w, r)
	case "/api/quit":
		if r.Method != "POST" {
			http.Error(w, "طريقة غير مدعومة", 405)
			return
		}
		writeJSON(w, map[string]bool{"ok": true})
		go func() { time.Sleep(200 * time.Millisecond); s.app.cancel() }()
	default:
		http.NotFound(w, r)
	}
}
func serveAsset(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != "GET" && r.Method != "HEAD" {
		http.Error(w, "طريقة غير مدعومة", 405)
		return
	}
	b, e := assets.ReadFile("web/" + name)
	if e != nil {
		http.NotFound(w, r)
		return
	}
	switch filepath.Ext(name) {
	case ".html":
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	case ".css":
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	case ".js":
		w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	case ".svg":
		w.Header().Set("Content-Type", "image/svg+xml")
	}
	_, _ = w.Write(b)
}
func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

var sessionNamePattern = regexp.MustCompile(`^scan-[0-9]{8}-[0-9]{6}-[0-9a-f]{6}\.json$`)

func validSessionName(s string) bool { return sessionNamePattern.MatchString(s) }
func pruneSessions(dir string) {
	files, _ := filepath.Glob(filepath.Join(dir, "scan-*.json"))
	sort.Strings(files)
	for len(files) > 20 {
		_ = os.Remove(files[0])
		files = files[1:]
	}
}
func csvSafe(s string) string {
	t := strings.TrimLeft(s, " \t\r\n")
	if t != "" && strings.ContainsRune("=+-@", rune(t[0])) {
		return "'" + s
	}
	return s
}
func (s *LocalServer) export(w http.ResponseWriter, r *http.Request) {
	state := s.app.State()
	name := "Mirsad-" + time.Now().Format("20060102-150405")
	format := r.URL.Query().Get("format")
	if format != "json" && format != "csv" && format != "html" {
		http.Error(w, "صيغة غير مدعومة", 400)
		return
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.%s"`, name, format))
	switch format {
	case "json":
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		_ = enc.Encode(state)
	case "csv":
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		_, _ = io.WriteString(w, "\ufeff")
		cw := csv.NewWriter(w)
		_ = cw.Write([]string{"القسم", "الحالة", "وقت القراءة", "التفاصيل", "البيانات"})
		for _, id := range sectionOrder {
			v := state.Sections[id]
			b, _ := json.Marshal(v.Data)
			_ = cw.Write([]string{sectionNames[id], arabicStatus(v.Status), v.UpdatedAt.Format(time.RFC3339), csvSafe(v.Message), csvSafe(string(b))})
		}
		cw.Flush()
	case "html":
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, reportHTML(state))
	}
}
func arabicStatus(s string) string {
	switch s {
	case "ready":
		return "اكتملت القراءة"
	case "running":
		return "قيد الفحص"
	case "error":
		return "تعذرت القراءة"
	default:
		return "لم يُفحص"
	}
}

var fieldNames = map[string]string{"ssid": "اسم الشبكة", "bssid": "عنوان نقطة الوصول", "signal": "جودة الإشارة", "rssi": "قوة الإشارة", "channel": "القناة", "frequency": "التردد بالكيلوهرتز", "band": "النطاق", "security": "الحماية", "adapter": "المحول", "cached": "نتيجة مخزنة بالنظام", "observedAt": "وقت الرصد", "name": "الاسم", "address": "العنوان", "kind": "النوع", "connected": "متصل", "paired": "مقترن", "seenAt": "وقت الرصد", "ip": "عنوان الشبكة", "mac": "العنوان الفيزيائي", "state": "الحالة", "interface": "المحول", "source": "المصدر", "rtt": "زمن الرد بالمللي ثانية", "Name": "الاسم", "Description": "الوصف", "Status": "الحالة", "MAC": "العنوان الفيزيائي", "LinkSpeed": "سرعة الارتباط", "IPv4": "عناوين الشبكة", "Gateway": "البوابة", "DNS": "ملقمات الأسماء", "LocalAddress": "العنوان المحلي", "LocalPort": "المنفذ المحلي", "RemoteAddress": "العنوان المقابل", "RemotePort": "المنفذ المقابل", "Process": "البرنامج", "PID": "معرّف العملية", "Protocol": "البروتوكول", "State": "الحالة", "Class": "الفئة", "DeviceID": "معرّف الجهاز", "Service": "برنامج التشغيل", "Port": "المنفذ", "ReceivedBytes": "البايتات المستلمة", "SentBytes": "البايتات المرسلة", "ReceivedErrors": "أخطاء الاستلام", "SentErrors": "أخطاء الإرسال", "Computer": "الكمبيوتر", "OS": "النظام", "Build": "بناء النظام", "CPU": "المعالج", "MemoryGB": "الذاكرة بالجيجابايت", "Architecture": "البنية", "Boot": "بدء النظام", "Profile": "الملف", "Enabled": "مفعّل", "Inbound": "الوارد", "Outbound": "الصادر"}

func flattenData(v any) []map[string]any {
	b, _ := json.Marshal(v)
	var rows []map[string]any
	if json.Unmarshal(b, &rows) == nil {
		return rows
	}
	var row map[string]any
	if json.Unmarshal(b, &row) == nil {
		return []map[string]any{row}
	}
	return nil
}
func displayValue(v any) string {
	switch x := v.(type) {
	case nil:
		return "غير متاح"
	case bool:
		if x {
			return "نعم"
		}
		return "لا"
	case string:
		return x
	case []any:
		parts := []string{}
		for _, v := range x {
			parts = append(parts, displayValue(v))
		}
		return strings.Join(parts, "، ")
	default:
		return fmt.Sprint(v)
	}
}
func reportHTML(s Snapshot) string {
	var b strings.Builder
	b.WriteString(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>تقرير مرصد الكمبيوتر</title><style>body{font:16px/1.8 'Segoe UI',Tahoma,sans-serif;color:#15263b;margin:40px}h1{color:#11685c}h2{margin-top:32px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #becbd7;padding:8px;text-align:right;overflow-wrap:anywhere}th{background:#edf4f5}small{color:#425771}section{break-inside:avoid}pre{white-space:pre-wrap}@media print{body{margin:12mm}table{font-size:10px}}</style><h1>مرصد الكمبيوتر — تقرير الفحص</h1>`)
	b.WriteString("<p>الإصدار " + version + " · أُنشئ التقرير في " + html.EscapeString(time.Now().Format(time.RFC3339)) + "</p><p>القراءات من جهاز التشغيل فقط. غياب النتائج لا يثبت غياب الأجهزة. لا يتضمن التقرير كلمات مرور الشبكات.</p>")
	for _, id := range sectionOrder {
		v := s.Sections[id]
		b.WriteString("<section><h2>" + sectionNames[id] + "</h2><p>" + arabicStatus(v.Status) + " — " + html.EscapeString(v.Message) + "</p>")
		if !v.UpdatedAt.IsZero() {
			b.WriteString("<small>آخر قراءة ناجحة: " + html.EscapeString(v.UpdatedAt.Format(time.RFC3339)) + "</small>")
			if v.Status != "ready" {
				b.WriteString("<p>البيانات التالية من القراءة السابقة.</p>")
			}
		}
		rows := flattenData(v.Data)
		if len(rows) == 0 {
			b.WriteString("<p>لا توجد بيانات مسجلة لهذا القسم.</p></section>")
			continue
		}
		keys := []string{}
		set := map[string]bool{}
		for _, row := range rows {
			for k := range row {
				set[k] = true
			}
		}
		for k := range set {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		b.WriteString("<table><thead><tr>")
		for _, k := range keys {
			label := fieldNames[k]
			if label == "" {
				label = k
			}
			b.WriteString("<th>" + html.EscapeString(label) + "</th>")
		}
		b.WriteString("</tr></thead><tbody>")
		for _, row := range rows {
			b.WriteString("<tr>")
			for _, k := range keys {
				b.WriteString("<td>" + html.EscapeString(displayValue(row[k])) + "</td>")
			}
			b.WriteString("</tr>")
		}
		b.WriteString("</tbody></table></section>")
	}
	b.WriteString("<h2>حدود القدرات</h2><table><tr><th>الوظيفة</th><th>التفاصيل</th></tr>")
	for _, c := range s.Capabilities {
		b.WriteString("<tr><td>" + html.EscapeString(c.Name) + "</td><td>" + html.EscapeString(c.Detail) + "</td></tr>")
	}
	b.WriteString("</table></html>")
	return b.String()
}
func startServer(a *App) (*LocalServer, net.Listener, error) {
	ln, e := net.Listen("tcp4", "127.0.0.1:0")
	if e != nil {
		return nil, nil, e
	}
	s := newLocalServer(a, ln.Addr().String())
	s.server = &http.Server{Handler: s, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 * 1024}
	return s, ln, nil
}

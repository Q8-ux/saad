package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testServer(t *testing.T) *LocalServer {
	a := NewApp(t.TempDir(), false)
	t.Cleanup(a.cancel)
	return newLocalServer(a, "127.0.0.1:12345")
}
func request(s *LocalServer, method, path, host, origin, csrf, cookie, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "http://"+host+path, strings.NewReader(body))
	r.Host = host
	if origin != "" {
		r.Header.Set("Origin", origin)
	}
	if csrf != "" {
		r.Header.Set("X-Mirsad-CSRF", csrf)
	}
	if cookie != "" {
		r.AddCookie(&http.Cookie{Name: "mirsad_session", Value: cookie})
	}
	w := httptest.NewRecorder()
	s.ServeHTTP(w, r)
	return w
}
func TestSessionAndCSRFBoundary(t *testing.T) {
	s := testServer(t)
	if got := request(s, "GET", "/api/state", s.host, "", "", "", "").Code; got != 401 {
		t.Fatalf("anonymous state %d", got)
	}
	if got := request(s, "GET", "/api/state", "attacker.example:12345", "", "", s.token, "").Code; got != 403 {
		t.Fatalf("rebinding %d", got)
	}
	if got := request(s, "POST", "/api/scan", s.host, "https://attacker.example", s.csrf, s.token, `{"section":"wifi"}`).Code; got != 403 {
		t.Fatalf("foreign origin %d", got)
	}
	if got := request(s, "POST", "/api/scan", s.host, "http://"+s.host, "bad", s.token, `{"section":"wifi"}`).Code; got != 403 {
		t.Fatalf("wrong csrf %d", got)
	}
	if got := request(s, "POST", "/api/scan", s.host, "http://"+s.host, s.csrf, s.token, `{"section":"arbitrary-shell"}`).Code; got != 400 {
		t.Fatalf("unsupported action %d", got)
	}
	w := request(s, "GET", "/api/state", s.host, "", "", s.token, "")
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	var snapshot Snapshot
	if err := json.Unmarshal(w.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(w.Header().Get("Content-Security-Policy"), "frame-ancestors 'none'") {
		t.Fatal("missing frame protection")
	}
	w = request(s, "GET", "/start/"+s.token, s.host, "", "", "", "")
	if w.Code != 303 || !strings.Contains(w.Header().Get("Set-Cookie"), "HttpOnly") {
		t.Fatal("launch must set HttpOnly cookie and redirect")
	}
}
func TestArchiveCannotReadPathsOrStreams(t *testing.T) {
	for _, name := range []string{"../scan-a.json", "scan-x.json:private.json", "scan-C:\\private.json", "scan-20260101-120000-abcdef.json/..", "scan-20260101-120000-abcdef.json\x00"} {
		if validSessionName(name) {
			t.Errorf("accepted %q", name)
		}
	}
	if !validSessionName("scan-20261126-143000-abcdef.json") {
		t.Fatal("valid generated name rejected")
	}
}
func TestReportEscapesNetworkNames(t *testing.T) {
	s := testServer(t)
	s.app.state.Sections["wifi"] = Section{ID: "wifi", Status: "ready", UpdatedAt: time.Now(), Data: []WifiNetwork{{SSID: `<img src=x onerror=alert(1)>`, BSSID: "AA:BB:CC:DD:EE:FF"}}}
	out := reportHTML(s.app.State())
	if strings.Contains(out, "<img src=x") || !strings.Contains(out, "&lt;img") {
		t.Fatal("untrusted name entered HTML")
	}
	if !strings.Contains(out, `dir="rtl"`) {
		t.Fatal("report is not RTL")
	}
}
func TestOnlyAllowlistedAssetsAreServed(t *testing.T) {
	s := testServer(t)
	for _, path := range []string{"/../go.mod", "/server.go", "/api/export?format=exe"} {
		w := request(s, "GET", path, s.host, "", "", s.token, "")
		if w.Code == 200 {
			t.Errorf("unexpected content from %s", path)
		}
	}
	w := request(s, "GET", "/app.js", s.host, "", "", s.token, "")
	b, _ := io.ReadAll(w.Result().Body)
	if w.Code != 200 || len(b) < 100 {
		t.Fatal("embedded app asset missing")
	}
}

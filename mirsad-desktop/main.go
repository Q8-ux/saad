package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	for _, arg := range os.Args[1:] {
		if arg == "--uninstall" {
			uninstallApp()
			return
		}
	}
	headless := false
	for _, arg := range os.Args[1:] {
		if arg == "--headless" {
			headless = true
		}
	}
	dataDir := applicationDataDir()
	if e := os.MkdirAll(dataDir, 0700); e != nil {
		showError("تعذر إنشاء مجلد بيانات البرنامج لهذا المستخدم.")
		return
	}
	installing := strings.Contains(strings.ToLower(filepath.Base(os.Args[0])), "setup")
	app := NewApp(dataDir, installing)
	defer app.cancel()
	s, ln, e := startServer(app)
	if e != nil {
		showError("تعذر تشغيل الواجهة المحلية.")
		return
	}
	url := "http://" + s.host + "/start/" + s.token
	if headless {
		fmt.Println(url)
	} else if e = launchUI(url, dataDir); e != nil {
		showError(e.Error())
		_ = ln.Close()
		return
	}
	info := map[string]any{"url": url, "pid": os.Getpid(), "version": version}
	b, _ := json.Marshal(info)
	infoPath := filepath.Join(dataDir, fmt.Sprintf("runtime-%d.json", os.Getpid()))
	_ = os.WriteFile(infoPath, b, 0600)
	defer os.Remove(infoPath)
	go func() { _ = s.server.Serve(ln); app.cancel() }()
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-app.ctx.Done():
				return
			case <-ticker.C:
				if !headless && time.Now().Unix()-s.lastHeartbeat.Load() > 90 {
					app.cancel()
					return
				}
			}
		}
	}()
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	select {
	case <-app.ctx.Done():
	case <-sig:
		app.cancel()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = s.server.Shutdown(ctx)
}

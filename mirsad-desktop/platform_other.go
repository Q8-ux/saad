//go:build !windows

package main

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
)

func platformName() string { return "بيئة مراجعة الواجهة — " + runtime.GOOS }
func applicationDataDir() string {
	if d := os.Getenv("MIRSAD_TEST_DATA"); d != "" {
		return d
	}
	return filepath.Join(os.TempDir(), "mirsad-review")
}
func installPath() string { return "التثبيت متاح على ويندوز فقط" }
func isInstalled() bool   { return false }
func collect(ctx context.Context, id string, active bool) (any, string, error) {
	return nil, "", errors.New("القراءة متاحة عند تشغيل ملف ويندوز على جهاز يدعم هذه الوظيفة")
}
func showError(s string) { println(s) }
func launchUI(url, dir string) error {
	return errors.New("شغّل مراجعة الواجهة باستخدام --headless")
}
func openSettings(s string) error {
	return errors.New("إعدادات ويندوز غير متاحة في بيئة المراجعة")
}
func installApp() error { return errors.New("التثبيت متاح على ويندوز فقط") }
func uninstallApp()     {}

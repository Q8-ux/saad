//go:build windows

package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"
)

var shellLinkClass = winGUID{0x00021401, 0, 0, [8]byte{0xc0, 0, 0, 0, 0, 0, 0, 0x46}}
var shellLinkIID = winGUID{0x000214f9, 0, 0, [8]byte{0xc0, 0, 0, 0, 0, 0, 0, 0x46}}
var persistFileIID = winGUID{0x0000010b, 0, 0, [8]byte{0xc0, 0, 0, 0, 0, 0, 0, 0x46}}
var desktopFolder = winGUID{0xb4bfcc3a, 0xdb2c, 0x424c, [8]byte{0xb0, 0x29, 0x7f, 0xe9, 0x9a, 0x87, 0xc6, 0x41}}
var programsFolder = winGUID{0xa77f5d77, 0x2e2b, 0x44c3, [8]byte{0xa6, 0xa2, 0xab, 0xa6, 0x01, 0x05, 0x4a, 0x51}}
var oleDLL = syscall.NewLazyDLL("ole32.dll")
var coInitialize = oleDLL.NewProc("CoInitializeEx")
var coUninitialize = oleDLL.NewProc("CoUninitialize")
var coCreate = oleDLL.NewProc("CoCreateInstance")
var knownFolder = syscall.NewLazyDLL("shell32.dll").NewProc("SHGetKnownFolderPath")
var regDLL = syscall.NewLazyDLL("advapi32.dll")
var regCreate = regDLL.NewProc("RegCreateKeyExW")
var regSet = regDLL.NewProc("RegSetValueExW")
var regClose = regDLL.NewProc("RegCloseKey")

const uninstallKey = `Software\Microsoft\Windows\CurrentVersion\Uninstall\MirsadDesktop`

func wide(s string) *uint16 { return syscall.StringToUTF16Ptr(s) }
func startCOM() (func(), error) {
	runtime.LockOSThread()
	hr, _, _ := coInitialize.Call(0, 2)
	if failedHR(hr) {
		runtime.UnlockOSThread()
		return nil, fmt.Errorf("تعذر تهيئة مثبت ويندوز (رمز %x)", hr)
	}
	return func() { coUninitialize.Call(); runtime.UnlockOSThread() }, nil
}
func folderPath(id *winGUID, create bool) (string, error) {
	var value uintptr
	flags := uintptr(0)
	if create {
		flags = 0x8000
	}
	hr, _, _ := knownFolder.Call(uintptr(unsafe.Pointer(id)), flags, 0, uintptr(unsafe.Pointer(&value)))
	if failedHR(hr) || value == 0 {
		return "", fmt.Errorf("تعذر تحديد مجلد اختصارات المستخدم (رمز %x)", hr)
	}
	defer coTaskFree.Call(value)
	chars := []uint16{}
	for i := uintptr(0); i < 32768; i++ {
		v := *(*uint16)(unsafe.Pointer(value + 2*i))
		if v == 0 {
			break
		}
		chars = append(chars, v)
	}
	p := syscall.UTF16ToString(chars)
	if !filepath.IsAbs(p) {
		return "", errors.New("أعاد ويندوز مسار اختصارات غير صالح")
	}
	if create {
		if e := os.MkdirAll(p, 0700); e != nil {
			return "", errors.New("تعذر إنشاء مجلد الاختصارات")
		}
	}
	return p, nil
}
func createNativeShortcut(path, target string) error {
	var link uintptr
	hr, _, _ := coCreate.Call(uintptr(unsafe.Pointer(&shellLinkClass)), 0, 1, uintptr(unsafe.Pointer(&shellLinkIID)), uintptr(unsafe.Pointer(&link)))
	if failedHR(hr) || link == 0 {
		return fmt.Errorf("تعذر إنشاء اختصار ويندوز (رمز %x)", hr)
	}
	defer comCall(link, 2)
	for _, c := range []struct {
		slot int
		text string
	}{{20, target}, {9, filepath.Dir(target)}, {7, "فحص الكمبيوتر والشبكات محليًا"}} {
		if hr = comCall(link, c.slot, uintptr(unsafe.Pointer(wide(c.text)))); failedHR(hr) {
			return fmt.Errorf("تعذر إعداد اختصار ويندوز (رمز %x)", hr)
		}
	}
	if hr = comCall(link, 17, uintptr(unsafe.Pointer(wide(target))), 0); failedHR(hr) {
		return fmt.Errorf("تعذر إعداد أيقونة الاختصار (رمز %x)", hr)
	}
	var persist uintptr
	hr = comCall(link, 0, uintptr(unsafe.Pointer(&persistFileIID)), uintptr(unsafe.Pointer(&persist)))
	if failedHR(hr) || persist == 0 {
		return errors.New("تعذر الوصول إلى ملف الاختصار")
	}
	defer comCall(persist, 2)
	if hr = comCall(persist, 6, uintptr(unsafe.Pointer(wide(path))), 1); failedHR(hr) {
		return fmt.Errorf("تعذر حفظ اختصار البرنامج (رمز %x)", hr)
	}
	return nil
}
func setRegistryString(key uintptr, name, value string) error {
	b := syscall.StringToUTF16(value)
	code, _, _ := regSet.Call(key, uintptr(unsafe.Pointer(wide(name))), 0, 1, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)*2))
	if code != 0 {
		return fmt.Errorf("تعذر تسجيل البرنامج في ويندوز (رمز %d)", code)
	}
	return nil
}
func setRegistryDWORD(key uintptr, name string, value uint32) error {
	code, _, _ := regSet.Call(key, uintptr(unsafe.Pointer(wide(name))), 0, 4, uintptr(unsafe.Pointer(&value)), 4)
	if code != 0 {
		return fmt.Errorf("تعذر تسجيل خيارات البرنامج (رمز %d)", code)
	}
	return nil
}
func registerInstallation(target string) error {
	var key uintptr
	code, _, _ := regCreate.Call(syscall.HKEY_CURRENT_USER, uintptr(unsafe.Pointer(wide(uninstallKey))), 0, 0, 0, 0x20006, 0, uintptr(unsafe.Pointer(&key)), 0)
	if code != 0 {
		return fmt.Errorf("تعذر تسجيل مثبت البرنامج (رمز %d)", code)
	}
	defer regClose.Call(key)
	values := []struct{ name, value string }{{"DisplayName", "مرصد الكمبيوتر"}, {"DisplayVersion", version}, {"Publisher", "Saad Rawdan"}, {"InstallLocation", filepath.Dir(target)}, {"DisplayIcon", target}, {"UninstallString", `"` + target + `" --uninstall`}}
	for _, v := range values {
		if e := setRegistryString(key, v.name, v.value); e != nil {
			return e
		}
	}
	if e := setRegistryDWORD(key, "NoModify", 1); e != nil {
		return e
	}
	return setRegistryDWORD(key, "NoRepair", 1)
}
func installApp() error {
	done, e := startCOM()
	if e != nil {
		return e
	}
	defer done()
	dir := installPath()
	if !filepath.IsAbs(dir) {
		return errors.New("تعذر تحديد مجلد تثبيت المستخدم")
	}
	if e = os.MkdirAll(dir, 0700); e != nil {
		return errors.New("تعذر إنشاء مجلد تثبيت البرنامج")
	}
	source, e := os.Executable()
	if e != nil {
		return errors.New("تعذر تحديد ملف البرنامج")
	}
	target := filepath.Join(dir, "Mirsad.exe")
	if !strings.EqualFold(filepath.Clean(source), filepath.Clean(target)) {
		b, e := os.ReadFile(source)
		if e != nil {
			return errors.New("تعذر قراءة ملف التثبيت")
		}
		temp := target + ".new"
		if e = os.WriteFile(temp, b, 0700); e != nil {
			return errors.New("تعذر كتابة ملف البرنامج")
		}
		move := syscall.NewLazyDLL("kernel32.dll").NewProc("MoveFileExW")
		ok, _, _ := move.Call(uintptr(unsafe.Pointer(wide(temp))), uintptr(unsafe.Pointer(wide(target))), 9)
		if ok == 0 {
			_ = os.Remove(temp)
			return errors.New("أغلق النسخة المثبتة ثم أعد التثبيت")
		}
	}
	for _, id := range []*winGUID{&desktopFolder, &programsFolder} {
		folder, e := folderPath(id, true)
		if e != nil {
			return e
		}
		if e = createNativeShortcut(filepath.Join(folder, "مرصد الكمبيوتر.lnk"), target); e != nil {
			return e
		}
	}
	return registerInstallation(target)
}

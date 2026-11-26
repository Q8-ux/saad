//go:build windows

package main

import (
	"context"
	"crypto/sha1"
	"encoding/binary"
	"errors"
	"runtime"
	"sort"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

type btFindRadio struct{ Size uint32 }
type winSystemTime struct{ Year, Month, DayOfWeek, Day, Hour, Minute, Second, Millisecond uint16 }
type btDeviceInfo struct {
	Size                                 uint32
	_                                    uint32
	Address                              uint64
	Class                                uint32
	Connected, Remembered, Authenticated int32
	LastSeen, LastUsed                   winSystemTime
	Name                                 [248]uint16
}
type btSearch struct {
	Size                                                   uint32
	Authenticated, Remembered, Unknown, Connected, Inquiry int32
	Timeout                                                byte
	_                                                      [7]byte
	Radio                                                  uintptr
}

var btDLL = syscall.NewLazyDLL("bthprops.cpl")
var btFirstRadio = btDLL.NewProc("BluetoothFindFirstRadio")
var btNextRadio = btDLL.NewProc("BluetoothFindNextRadio")
var btCloseFindRadio = btDLL.NewProc("BluetoothFindRadioClose")
var btFirstDevice = btDLL.NewProc("BluetoothFindFirstDevice")
var btNextDevice = btDLL.NewProc("BluetoothFindNextDevice")
var btCloseFind = btDLL.NewProc("BluetoothFindDeviceClose")
var closeWinHandle = syscall.NewLazyDLL("kernel32.dll").NewProc("CloseHandle")

func systemTime(t winSystemTime) time.Time {
	if t.Year < 2000 || t.Month < 1 || t.Month > 12 || t.Day < 1 || t.Day > 31 {
		return time.Time{}
	}
	return time.Date(int(t.Year), time.Month(t.Month), int(t.Day), int(t.Hour), int(t.Minute), int(t.Second), int(t.Millisecond)*1000000, time.UTC)
}
func classicBluetooth(ctx context.Context) ([]BluetoothDevice, error) {
	if e := btFirstRadio.Find(); e != nil {
		return nil, errors.New("قراءة البلوتوث التقليدي غير متاحة في ويندوز")
	}
	p := btFindRadio{uint32(unsafe.Sizeof(btFindRadio{}))}
	var radio uintptr
	finder, _, _ := btFirstRadio.Call(uintptr(unsafe.Pointer(&p)), uintptr(unsafe.Pointer(&radio)))
	if finder == 0 {
		return nil, errors.New("لا توجد بطاقة بلوتوث مفعلة أو يتعذر الوصول إليها")
	}
	defer btCloseFindRadio.Call(finder)
	result := []BluetoothDevice{}
	for {
		params := btSearch{Size: uint32(unsafe.Sizeof(btSearch{})), Authenticated: 1, Remembered: 1, Unknown: 1, Connected: 1, Inquiry: 1, Timeout: 2, Radio: radio}
		info := btDeviceInfo{Size: uint32(unsafe.Sizeof(btDeviceInfo{}))}
		h, _, err := btFirstDevice.Call(uintptr(unsafe.Pointer(&params)), uintptr(unsafe.Pointer(&info)))
		if h != 0 {
			for {
				name := syscall.UTF16ToString(info.Name[:])
				if name == "" {
					name = "جهاز بلوتوث دون اسم"
				}
				result = append(result, BluetoothDevice{Name: name, Address: bluetoothAddress(info.Address), Kind: "بلوتوث تقليدي", Connected: info.Connected != 0, Paired: info.Remembered != 0 || info.Authenticated != 0, SeenAt: systemTime(info.LastSeen)})
				if ctx.Err() != nil {
					break
				}
				info = btDeviceInfo{Size: uint32(unsafe.Sizeof(btDeviceInfo{}))}
				ok, _, _ := btNextDevice.Call(h, uintptr(unsafe.Pointer(&info)))
				if ok == 0 {
					break
				}
			}
			btCloseFind.Call(h)
		} else if err != syscall.Errno(259) && err != syscall.Errno(0) {
			closeWinHandle.Call(radio)
			return result, errors.New("تعذر اكتشاف أجهزة البلوتوث التقليدي؛ تحقق من إعدادات البطاقة")
		}
		closeWinHandle.Call(radio)
		if ctx.Err() != nil {
			return result, errors.New("أُوقف فحص البلوتوث")
		}
		ok, _, _ := btNextRadio.Call(finder, uintptr(unsafe.Pointer(&radio)))
		if ok == 0 {
			break
		}
	}
	return result, nil
}
func scanBluetooth(ctx context.Context) (any, string, error) {
	type result struct {
		rows []BluetoothDevice
		err  error
	}
	classic := make(chan result, 1)
	go func() { r, e := classicBluetooth(ctx); classic <- result{r, e} }()
	ble, bleErr := bleBluetooth(ctx)
	c := <-classic
	if ctx.Err() != nil {
		return nil, "", errors.New("أُوقف فحص البلوتوث")
	}
	if c.err != nil && bleErr != nil {
		return nil, "", errors.New("تعذر فحص البلوتوث. شغّل بطاقة البلوتوث وحدّث تعريفها وراجع أذونات الخصوصية في ويندوز")
	}
	rows := append(c.rows, ble...)
	dedup := map[string]BluetoothDevice{}
	for _, d := range rows {
		key := d.Address + "|" + d.Kind
		dedup[key] = d
	}
	rows = []BluetoothDevice{}
	for _, d := range dedup {
		rows = append(rows, d)
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].Name < rows[j].Name })
	msg := "الأجهزة التقليدية المعروفة أو القابلة للاكتشاف، وإعلانات البلوتوث منخفض الطاقة خلال نافذة الفحص. الأجهزة الصامتة أو المخفية قد لا تظهر."
	if c.err != nil {
		msg += " لم تتوفر قراءة البلوتوث التقليدي."
	}
	if bleErr != nil {
		msg += " لم تتوفر قراءة الإعلانات منخفضة الطاقة؛ النتائج للأجهزة التقليدية فقط."
	}
	return rows, msg, nil
}

// Native WinRT advertisement listener. Interface layouts follow Microsoft's
// public Windows SDK. No external package, driver, or service is involved.
var comBase = syscall.NewLazyDLL("combase.dll")
var roInitialize = comBase.NewProc("RoInitialize")
var roUninitialize = comBase.NewProc("RoUninitialize")
var roActivate = comBase.NewProc("RoActivateInstance")
var createHString = comBase.NewProc("WindowsCreateString")
var deleteHString = comBase.NewProc("WindowsDeleteString")
var hStringBuffer = comBase.NewProc("WindowsGetStringRawBuffer")
var coTaskAlloc = comBase.NewProc("CoTaskMemAlloc")
var coTaskFree = comBase.NewProc("CoTaskMemFree")
var watcherIID = winGUID{0xa6ac336f, 0xf3d3, 0x4297, [8]byte{0x8d, 0x6c, 0xc8, 0x1e, 0xa6, 0x62, 0x3f, 0x40}}
var unknownIID = winGUID{0, 0, 0, [8]byte{0xc0, 0, 0, 0, 0, 0, 0, 0x46}}
var agileIID = winGUID{0x94ea2b94, 0xe9cc, 0x49e0, [8]byte{0xc0, 0xff, 0xee, 0x64, 0xca, 0x8f, 0x5b, 0x90}}
var receivedIID = winrtHandlerIID("pinterface({9de1c534-6ae1-11e0-84e1-18a905bcc53f};rc(Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher;{a6ac336f-f3d3-4297-8d6c-c81ea6623f40});rc(Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementReceivedEventArgs;{27987ddf-e596-41be-8d43-9e6731d4a913}))")

func winrtHandlerIID(signature string) winGUID {
	namespace := []byte{0x11, 0xf4, 0x7a, 0xd5, 0x7b, 0x73, 0x42, 0xc0, 0xab, 0xae, 0x87, 0x8b, 0x1e, 0x16, 0xad, 0xee}
	h := sha1.New()
	h.Write(namespace)
	h.Write([]byte(signature))
	b := h.Sum(nil)[:16]
	b[6] = (b[6] & 15) | 0x50
	b[8] = (b[8] & 63) | 0x80
	var tail [8]byte
	copy(tail[:], b[8:])
	return winGUID{binary.BigEndian.Uint32(b), binary.BigEndian.Uint16(b[4:]), binary.BigEndian.Uint16(b[6:]), tail}
}

type bleState struct {
	mu      sync.Mutex
	devices map[string]BluetoothDevice
}

var bleStatesMu sync.RWMutex
var bleStates = map[uintptr]*bleState{}

//go:uintptrescapes
func comCall(obj uintptr, index int, args ...uintptr) uintptr {
	vt := *(*uintptr)(unsafe.Pointer(obj))
	fn := *(*uintptr)(unsafe.Pointer(vt + uintptr(index)*unsafe.Sizeof(uintptr(0))))
	r, _, _ := syscall.SyscallN(fn, append([]uintptr{obj}, args...)...)
	return r
}
func failedHR(hr uintptr) bool { return int32(hr) < 0 }
func hStringText(h uintptr) string {
	if h == 0 {
		return ""
	}
	var length uint32
	p, _, _ := hStringBuffer.Call(h, uintptr(unsafe.Pointer(&length)))
	if p == 0 || length > 32768 {
		return ""
	}
	return syscall.UTF16ToString(unsafe.Slice((*uint16)(unsafe.Pointer(p)), length))
}

var bleVTable = [4]uintptr{
	syscall.NewCallback(func(this, iid, out uintptr) uintptr {
		if out == 0 || iid == 0 {
			return 0x80004003
		}
		want := *(*winGUID)(unsafe.Pointer(iid))
		if want != unknownIID && want != agileIID && want != receivedIID {
			*(*uintptr)(unsafe.Pointer(out)) = 0
			return 0x80004002
		}
		*(*uintptr)(unsafe.Pointer(out)) = this
		atomic.AddInt32((*int32)(unsafe.Pointer(this+8)), 1)
		return 0
	}),
	syscall.NewCallback(func(this uintptr) uintptr { return uintptr(atomic.AddInt32((*int32)(unsafe.Pointer(this+8)), 1)) }),
	syscall.NewCallback(func(this uintptr) uintptr {
		n := atomic.AddInt32((*int32)(unsafe.Pointer(this+8)), -1)
		if n == 0 {
			bleStatesMu.Lock()
			delete(bleStates, this)
			bleStatesMu.Unlock()
			coTaskFree.Call(this)
		}
		return uintptr(n)
	}),
	syscall.NewCallback(func(this, sender, args uintptr) uintptr {
		bleStatesMu.RLock()
		state := bleStates[this]
		bleStatesMu.RUnlock()
		if state == nil || args == 0 {
			return 0
		}
		var address uint64
		var rssi int16
		var advertisement uintptr
		if failedHR(comCall(args, 7, uintptr(unsafe.Pointer(&address)))) {
			return 0
		}
		_ = comCall(args, 6, uintptr(unsafe.Pointer(&rssi)))
		name := ""
		if !failedHR(comCall(args, 10, uintptr(unsafe.Pointer(&advertisement)))) && advertisement != 0 {
			var hs uintptr
			if !failedHR(comCall(advertisement, 8, uintptr(unsafe.Pointer(&hs)))) {
				name = hStringText(hs)
				if hs != 0 {
					deleteHString.Call(hs)
				}
			}
			comCall(advertisement, 2)
		}
		mac := bluetoothAddress(address)
		state.mu.Lock()
		if name == "" {
			name = state.devices[mac].Name
		}
		if name == "" {
			name = "جهاز منخفض الطاقة دون اسم"
		}
		var signal *int16
		if rssi != 127 {
			v := rssi
			signal = &v
		}
		state.devices[mac] = BluetoothDevice{Name: name, Address: mac, Kind: "بلوتوث منخفض الطاقة", RSSI: signal, SeenAt: time.Now()}
		state.mu.Unlock()
		return 0
	}),
}

func bleBluetooth(ctx context.Context) ([]BluetoothDevice, error) {
	if e := roInitialize.Find(); e != nil {
		return nil, errors.New("قراءة البلوتوث منخفض الطاقة غير متاحة")
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	hr, _, _ := roInitialize.Call(1)
	if failedHR(hr) {
		return nil, errors.New("تعذر تهيئة قارئ البلوتوث منخفض الطاقة")
	}
	defer roUninitialize.Call()
	name := syscall.StringToUTF16("Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher")
	var hs uintptr
	hr, _, _ = createHString.Call(uintptr(unsafe.Pointer(&name[0])), uintptr(len(name)-1), uintptr(unsafe.Pointer(&hs)))
	if failedHR(hr) {
		return nil, errors.New("تعذر تهيئة قارئ الإعلانات")
	}
	defer deleteHString.Call(hs)
	var inspectable uintptr
	hr, _, _ = roActivate.Call(hs, uintptr(unsafe.Pointer(&inspectable)))
	if failedHR(hr) || inspectable == 0 {
		return nil, errors.New("واجهة البلوتوث منخفض الطاقة غير مدعومة")
	}
	defer comCall(inspectable, 2)
	var watcher uintptr
	hr = comCall(inspectable, 0, uintptr(unsafe.Pointer(&watcherIID)), uintptr(unsafe.Pointer(&watcher)))
	if failedHR(hr) || watcher == 0 {
		return nil, errors.New("تعذر الوصول إلى قارئ البلوتوث")
	}
	defer comCall(watcher, 2)
	delegate, _, _ := coTaskAlloc.Call(16)
	if delegate == 0 {
		return nil, errors.New("تعذر تخصيص قارئ الإعلانات")
	}
	*(*uintptr)(unsafe.Pointer(delegate)) = uintptr(unsafe.Pointer(&bleVTable[0]))
	*(*int32)(unsafe.Pointer(delegate + 8)) = 1
	state := &bleState{devices: make(map[string]BluetoothDevice)}
	bleStatesMu.Lock()
	bleStates[delegate] = state
	bleStatesMu.Unlock()
	defer comCall(delegate, 2)
	var eventToken int64
	hr = comCall(watcher, 19, delegate, uintptr(unsafe.Pointer(&eventToken)))
	if failedHR(hr) {
		return nil, errors.New("تعذر الاشتراك في إعلانات البلوتوث")
	}
	defer comCall(watcher, 20, uintptr(eventToken))
	// Passive reception avoids sending scan requests to nearby devices.
	_ = comCall(watcher, 12, 0)
	if failedHR(comCall(watcher, 17)) {
		return nil, errors.New("تعذر بدء قراءة إعلانات البلوتوث")
	}
	defer comCall(watcher, 18)
	timer := time.NewTimer(7 * time.Second)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return nil, errors.New("أُوقف فحص البلوتوث")
	case <-timer.C:
	}
	var status int32
	_ = comCall(watcher, 10, uintptr(unsafe.Pointer(&status)))
	if status == 4 {
		return nil, errors.New("أوقف ويندوز قارئ البلوتوث؛ تحقق من وجود بطاقة متوافقة ومفعلة")
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	rows := []BluetoothDevice{}
	for _, v := range state.devices {
		rows = append(rows, v)
	}
	return rows, nil
}

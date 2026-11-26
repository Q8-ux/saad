//go:build windows

package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

type winGUID struct {
	D1     uint32
	D2, D3 uint16
	D4     [8]byte
}
type wlanInterface struct {
	GUID        winGUID
	Description [256]uint16
	State       uint32
}
type dotSSID struct {
	Length uint32
	Value  [32]byte
}
type wlanRates struct {
	Length uint32
	Rates  [126]uint16
}
type wlanBSSEntry struct {
	SSID                     dotSSID
	PhyID                    uint32
	BSSID                    [6]byte
	_                        [2]byte
	BSSType, PhyType         uint32
	RSSI                     int32
	Quality                  uint32
	InRegDomain              byte
	_                        byte
	BeaconPeriod             uint16
	_                        [4]byte
	Timestamp, HostTimestamp uint64
	Capabilities             uint16
	_                        [2]byte
	Frequency                uint32
	RateSet                  wlanRates
	IEOffset, IESize         uint32
}
type wlanNotification struct {
	Source, Code uint32
	GUID         winGUID
	DataSize     uint32
	Data         uintptr
}
type scanEvent struct {
	GUID winGUID
	Code uint32
}

var wlanDLL = syscall.NewLazyDLL("wlanapi.dll")
var wlanOpen = wlanDLL.NewProc("WlanOpenHandle")
var wlanClose = wlanDLL.NewProc("WlanCloseHandle")
var wlanEnum = wlanDLL.NewProc("WlanEnumInterfaces")
var wlanFree = wlanDLL.NewProc("WlanFreeMemory")
var wlanScan = wlanDLL.NewProc("WlanScan")
var wlanBSS = wlanDLL.NewProc("WlanGetNetworkBssList")
var wlanRegister = wlanDLL.NewProc("WlanRegisterNotification")
var wifiCallbackMu sync.RWMutex
var wifiCallbacks = map[uintptr]chan scanEvent{}
var wifiSequence atomic.Uint64
var wifiCallback = syscall.NewCallback(func(data, ctx uintptr) uintptr {
	if data == 0 {
		return 0
	}
	n := (*wlanNotification)(unsafe.Pointer(data))
	if n.Source&8 == 0 || (n.Code != 7 && n.Code != 8) {
		return 0
	}
	wifiCallbackMu.RLock()
	ch := wifiCallbacks[ctx]
	if ch != nil {
		select {
		case ch <- scanEvent{n.GUID, n.Code}:
		default:
		}
	}
	wifiCallbackMu.RUnlock()
	return 0
})

func wifiError(code uintptr) error {
	switch code {
	case 5:
		return errors.New("رفض ويندوز الوصول إلى بيانات الواي فاي. فعّل خدمات الموقع والسماح لتطبيقات سطح المكتب في إعدادات الخصوصية ثم أعد الفحص")
	case 1062:
		return errors.New("خدمة إعداد الواي فاي التلقائي متوقفة في ويندوز")
	case 1168:
		return errors.New("لم يُعثر على بطاقة واي فاي متاحة")
	case 50:
		return errors.New("برنامج تشغيل بطاقة الواي فاي لا يدعم هذا النوع من القراءة")
	case 5023:
		return errors.New("بطاقة الواي فاي متوقفة أو في حالة لا تسمح بالفحص")
	default:
		return fmt.Errorf("تعذرت قراءة الواي فاي من ويندوز (رمز %d)", code)
	}
}
func scanWiFi(ctx context.Context) (any, string, error) {
	if e := wlanOpen.Find(); e != nil {
		return nil, "", errors.New("واجهات الواي فاي غير متاحة في نسخة ويندوز الحالية")
	}
	var negotiated uint32
	var handle uintptr
	code, _, _ := wlanOpen.Call(2, 0, uintptr(unsafe.Pointer(&negotiated)), uintptr(unsafe.Pointer(&handle)))
	if code != 0 {
		return nil, "", wifiError(code)
	}
	defer wlanClose.Call(handle, 0)
	var ptr uintptr
	code, _, _ = wlanEnum.Call(handle, 0, uintptr(unsafe.Pointer(&ptr)))
	if code != 0 {
		return nil, "", wifiError(code)
	}
	defer wlanFree.Call(ptr)
	if ptr == 0 {
		return nil, "", errors.New("لم يعد ويندوز معلومات محولات الواي فاي")
	}
	count := *(*uint32)(unsafe.Pointer(ptr))
	if count == 0 {
		return nil, "", errors.New("لا توجد بطاقة واي فاي متاحة؛ تحقق من تعريف البطاقة وتشغيلها")
	}
	if count > 64 {
		return nil, "", errors.New("أعاد ويندوز قائمة محولات غير صالحة")
	}
	key := uintptr(wifiSequence.Add(1))
	events := make(chan scanEvent, 128)
	wifiCallbackMu.Lock()
	wifiCallbacks[key] = events
	wifiCallbackMu.Unlock()
	defer func() { wifiCallbackMu.Lock(); delete(wifiCallbacks, key); wifiCallbackMu.Unlock() }()
	var previous uint32
	reg, _, _ := wlanRegister.Call(handle, 8, 0, wifiCallback, key, 0, uintptr(unsafe.Pointer(&previous)))
	if reg == 0 {
		defer wlanRegister.Call(handle, 0, 0, 0, 0, 0, uintptr(unsafe.Pointer(&previous)))
	}
	rows := []WifiNetwork{}
	var lastErr error
	cached := false
	partial := false
	for i := uint32(0); i < count; i++ {
		if ctx.Err() != nil {
			return nil, "", errors.New("أُوقف فحص الواي فاي")
		}
		item := (*wlanInterface)(unsafe.Pointer(ptr + 8 + uintptr(i)*unsafe.Sizeof(wlanInterface{})))
		guid := item.GUID
		adapter := syscall.UTF16ToString(item.Description[:])
		requested := time.Now()
		scanCode, _, _ := wlanScan.Call(handle, uintptr(unsafe.Pointer(&guid)), 0, 0, 0)
		fresh := false
		if scanCode == 0 && reg == 0 {
			timer := time.NewTimer(7 * time.Second)
		wait:
			for {
				select {
				case ev := <-events:
					if ev.GUID == guid {
						fresh = ev.Code == 7
						break wait
					}
				case <-timer.C:
					break wait
				case <-ctx.Done():
					timer.Stop()
					return nil, "", errors.New("أُوقف فحص الواي فاي")
				}
			}
			timer.Stop()
		} else if scanCode != 0 {
			lastErr = wifiError(scanCode)
		}
		var list uintptr
		bssCode, _, _ := wlanBSS.Call(handle, uintptr(unsafe.Pointer(&guid)), 0, 3, 0, 0, uintptr(unsafe.Pointer(&list)))
		if bssCode != 0 {
			lastErr = wifiError(bssCode)
			partial = true
			continue
		}
		if list == 0 {
			partial = true
			continue
		}
		total := *(*uint32)(unsafe.Pointer(list))
		num := *(*uint32)(unsafe.Pointer(list + 4))
		size := unsafe.Sizeof(wlanBSSEntry{})
		if total < 8 || num > 10000 || uint64(num)*uint64(size)+8 > uint64(total) {
			wlanFree.Call(list)
			lastErr = errors.New("أعاد برنامج تشغيل الواي فاي بيانات غير صالحة")
			partial = true
			continue
		}
		for j := uint32(0); j < num; j++ {
			entryPtr := list + 8 + uintptr(j)*size
			n := (*wlanBSSEntry)(unsafe.Pointer(entryPtr))
			l := n.SSID.Length
			if l > 32 {
				continue
			}
			ssid := strings.ToValidUTF8(string(n.SSID.Value[:l]), "�")
			ssid = strings.ReplaceAll(ssid, "\x00", "")
			if ssid == "" {
				ssid = "شبكة مخفية"
			}
			observed := time.Time{}
			if n.HostTimestamp > 116444736000000000 {
				observed = time.Unix(0, int64(n.HostTimestamp-116444736000000000)*100)
			}
			isCached := !fresh || observed.IsZero() || observed.Before(requested.Add(-2*time.Second))
			if isCached {
				cached = true
			}
			if observed.IsZero() {
				observed = requested
			}
			channel, band := frequencyChannel(n.Frequency)
			security := "مفتوحة"
			if n.Capabilities&0x10 != 0 {
				security = "محمية — النوع غير محدد"
			}
			if n.IESize > 0 && n.IESize <= 4096 && n.IEOffset >= uint32(size) && uint64(entryPtr-list)+uint64(n.IEOffset)+uint64(n.IESize) <= uint64(total) {
				blob := unsafe.Slice((*byte)(unsafe.Pointer(entryPtr+uintptr(n.IEOffset))), int(n.IESize))
				if value := securityFromIE(blob); value != "" {
					security = value
				}
			}
			mac := fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X", n.BSSID[0], n.BSSID[1], n.BSSID[2], n.BSSID[3], n.BSSID[4], n.BSSID[5])
			rows = append(rows, WifiNetwork{SSID: ssid, BSSID: mac, Signal: min(int(n.Quality), 100), RSSI: n.RSSI, Channel: channel, Frequency: n.Frequency, Band: band, Security: security, Adapter: adapter, Cached: isCached, ObservedAt: observed})
		}
		wlanFree.Call(list)
	}
	if len(rows) == 0 && lastErr != nil {
		return nil, "", lastErr
	}
	sortWifi(rows)
	msg := "نتائج ويندوز مع وقت رصد كل نقطة وصول. قوة الإشارة تقريبية ولا تعني مسافة أو اتجاهًا."
	if cached {
		msg += " تتضمن القائمة نتائج محفوظة لدى النظام؛ تُميّز ولا تُضاف إلى سجل القياسات الجديدة."
	}
	if partial {
		msg += " تعذرت قراءة بعض المحولات."
	}
	return rows, msg, nil
}

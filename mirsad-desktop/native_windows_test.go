//go:build windows

package main

import (
	"context"
	"os"
	"testing"
	"time"
	"unsafe"
)

func TestNativeABILayout(t *testing.T) {
	for _, c := range []struct {
		name      string
		got, want uintptr
	}{{"BSS entry", unsafe.Sizeof(wlanBSSEntry{}), 360}, {"BSS RSSI", unsafe.Offsetof(wlanBSSEntry{}.RSSI), 56}, {"host timestamp", unsafe.Offsetof(wlanBSSEntry{}.HostTimestamp), 80}, {"IE offset", unsafe.Offsetof(wlanBSSEntry{}.IEOffset), 352}, {"WLAN interface", unsafe.Sizeof(wlanInterface{}), 532}, {"notification data", unsafe.Offsetof(wlanNotification{}.Data), 32}, {"Bluetooth device", unsafe.Sizeof(btDeviceInfo{}), 560}, {"Bluetooth search", unsafe.Sizeof(btSearch{}), 40}} {
		if c.got != c.want {
			t.Errorf("%s: got %d expected %d", c.name, c.got, c.want)
		}
	}
}

func TestWindowsBuiltInCollectors(t *testing.T) {
	if os.Getenv("MIRSAD_WINDOWS_SMOKE") != "1" {
		t.Skip("requires an actual Windows validation host")
	}
	for _, id := range []string{"system", "adapters", "ports", "hardware", "traffic", "security", "serial"} {
		t.Run(id, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()
			data, _, err := collect(ctx, id, false)
			if err != nil {
				t.Fatal(err)
			}
			if (id == "system" || id == "adapters") && len(flattenData(data)) == 0 {
				t.Fatal("expected host data")
			}
			t.Logf("%s: records=%d", id, len(flattenData(data)))
		})
	}
}

func TestWinRTTypedEventHandlerIID(t *testing.T) {
	want := winGUID{0x90eb4eca, 0xd465, 0x5ea0, [8]byte{0xa6, 0x1c, 0x03, 0x3c, 0x8c, 0x5e, 0xce, 0xf2}}
	if receivedIID != want {
		t.Fatal("incorrect typed event handler interface identifier")
	}
}

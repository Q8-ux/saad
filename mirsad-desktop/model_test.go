package main

import (
	"net"
	"strings"
	"testing"
)

func TestChannelMappingAcrossBands(t *testing.T) {
	for _, c := range []struct {
		freq    uint32
		channel int
		band    string
	}{{2412000, 1, "2.4"}, {2472000, 13, "2.4"}, {2484000, 14, "2.4"}, {5180000, 36, "5"}, {5935000, 2, "6"}, {5955000, 1, "6"}, {7115000, 233, "6"}, {915000, 0, "غير معروف"}} {
		channel, band := frequencyChannel(c.freq)
		if channel != c.channel || band != c.band {
			t.Errorf("%d: %d %s", c.freq, channel, band)
		}
	}
}
func TestDiscoveryIsPrivateAndBounded(t *testing.T) {
	for _, c := range []struct {
		cidr  string
		want  int
		scope string
	}{{"192.168.5.8/24", 253, "192.168.5.0/24"}, {"10.20.33.4/16", 253, "10.20.33.0/24"}, {"172.20.0.1/30", 1, "172.20.0.0/30"}} {
		ip, block, _ := net.ParseCIDR(c.cidr)
		targets, scope, err := boundedSubnet(ip, block.Mask)
		if err != nil || len(targets) != c.want || scope != c.scope {
			t.Fatalf("%s: %d %s %v", c.cidr, len(targets), scope, err)
		}
		for _, x := range targets {
			if x.Equal(ip) {
				t.Fatal("must not probe own address")
			}
		}
	}
	for _, cidr := range []string{"8.8.8.8/24", "127.0.0.1/8", "192.168.0.1/31", "2001:db8::1/64"} {
		ip, b, _ := net.ParseCIDR(cidr)
		if _, _, e := boundedSubnet(ip, b.Mask); e == nil {
			t.Errorf("accepted unsafe or unsuitable range %s", cidr)
		}
	}
}
func TestBluetoothAddressOrder(t *testing.T) {
	if bluetoothAddress(0xA1B2C3D4E5F6) != "A1:B2:C3:D4:E5:F6" {
		t.Fatal("incorrect on-air address representation")
	}
}
func TestSecurityParserHandlesUntrustedIE(t *testing.T) {
	for n := 0; n < 256; n++ {
		securityFromIE([]byte{48, byte(n), 1, 0, 0, 15, 172, 4})
	}
	// RSN: version, group cipher, one pairwise cipher, one SAE authentication suite.
	rsn := []byte{48, 18, 1, 0, 0, 15, 172, 4, 1, 0, 0, 15, 172, 4, 1, 0, 0, 15, 172, 8}
	if s := securityFromIE(rsn); s != "WPA3" {
		t.Fatalf("SAE: %q", s)
	}
	if s := securityFromIE([]byte{48, 255, 1}); s != "" {
		t.Fatal("must reject truncated information element")
	}
}
func TestCSVNeutralizesFormulas(t *testing.T) {
	for _, x := range []string{"=HYPERLINK(\"x\")", " +SUM(1,2)", "\t@cmd", "\r-1+2"} {
		if !strings.HasPrefix(csvSafe(x), "'") {
			t.Errorf("formula not neutralized: %q", x)
		}
	}
	if csvSafe("شبكة المنزل") != "شبكة المنزل" {
		t.Fatal("normal text changed")
	}
}

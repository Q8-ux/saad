package main

import "encoding/binary"

func securityFromIE(blob []byte) string {
	for len(blob) >= 2 {
		typ, l := blob[0], int(blob[1])
		if l+2 > len(blob) {
			break
		}
		b := blob[2 : l+2]
		blob = blob[l+2:]
		if typ == 221 && len(b) >= 4 && b[0] == 0 && b[1] == 0x50 && b[2] == 0xf2 && b[3] == 1 {
			return "WPA"
		}
		if typ != 48 || len(b) < 8 {
			continue
		}
		pairs := int(binary.LittleEndian.Uint16(b[6:8]))
		pos := 8 + pairs*4
		if pos+2 > len(b) {
			continue
		}
		n := int(binary.LittleEndian.Uint16(b[pos : pos+2]))
		pos += 2
		personal, enterprise, sae, owe := false, false, false, false
		for i := 0; i < n && pos+4 <= len(b); i++ {
			s := b[pos : pos+4]
			pos += 4
			if s[0] != 0 || s[1] != 0x0f || s[2] != 0xac {
				continue
			}
			switch s[3] {
			case 1, 3, 5, 11, 12, 13:
				enterprise = true
			case 2, 4, 6:
				personal = true
			case 8, 9:
				sae = true
			case 18:
				owe = true
			}
		}
		switch {
		case sae && personal:
			return "WPA2 / WPA3"
		case sae:
			return "WPA3"
		case owe:
			return "OWE — تشفير دون كلمة مرور"
		case enterprise:
			return "WPA2 / WPA3 — مؤسسية"
		case personal:
			return "WPA2"
		default:
			return "RSN — محمية"
		}
	}
	return ""
}

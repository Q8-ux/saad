//go:build windows

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"unsafe"
)

var psSlots = make(chan struct{}, 3)

func platformName() string       { return "ويندوز" }
func applicationDataDir() string { return filepath.Join(os.Getenv("LOCALAPPDATA"), "Mirsad") }
func installPath() string        { return filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Mirsad") }
func isInstalled() bool          { _, e := os.Stat(filepath.Join(installPath(), "Mirsad.exe")); return e == nil }
func windowsCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	c := exec.CommandContext(ctx, name, args...)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return c
}
func psJSON(ctx context.Context, script string) ([]map[string]any, error) {
	select {
	case psSlots <- struct{}{}:
		defer func() { <-psSlots }()
	case <-ctx.Done():
		return nil, errors.New("انتهت مهلة الفحص أو أُوقف")
	}
	full := "$ErrorActionPreference='Stop'; [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false); $items = @( & { " + script + " } ); ConvertTo-Json -InputObject $items -Depth 6 -Compress"
	out, e := windowsCommand(ctx, "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", full).Output()
	if ctx.Err() != nil {
		return nil, errors.New("انتهت مهلة الفحص أو أُوقف")
	}
	if e != nil {
		if os.Getenv("MIRSAD_WINDOWS_SMOKE") == "1" {
			var failure *exec.ExitError
			if errors.As(e, &failure) {
				fmt.Fprintln(os.Stderr, "Windows collector diagnostic:", string(failure.Stderr))
			}
		}
		return nil, errors.New("تعذرت القراءة من أدوات ويندوز. تحقق من توافر PowerShell وأذونات حسابك")
	}
	rows := []map[string]any{}
	if e = json.Unmarshal(out, &rows); e != nil {
		return nil, errors.New("تعذر تفسير البيانات التي أعادها ويندوز")
	}
	return rows, nil
}
func collect(ctx context.Context, id string, active bool) (any, string, error) {
	var script, msg string
	switch id {
	case "wifi":
		return scanWiFi(ctx)
	case "bluetooth":
		return scanBluetooth(ctx)
	case "adapters":
		script = `Get-NetAdapter -IncludeHidden | Where-Object { $_.HardwareInterface -or $_.Status -eq 'Up' } | ForEach-Object { $a=$_; $ips=@(Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue); $gw=@(Get-NetRoute -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue); $dns=@(Get-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ErrorAction SilentlyContinue); [pscustomobject]@{Name=$a.Name;Description=$a.InterfaceDescription;Status=[string]$a.Status;MAC=$a.MacAddress;LinkSpeed=$a.LinkSpeed;IPv4=@($ips | ForEach-Object { [string]$_.IPAddress + '/' + [string]$_.PrefixLength });Gateway=@($gw.NextHop | Where-Object {$_} | Select-Object -Unique);DNS=@($dns.ServerAddresses | Where-Object {$_} | Select-Object -Unique)} }`
		msg = "عناوين المحولات والبوابات وملقمات الأسماء. سرعة الارتباط ليست قياس سرعة الإنترنت."
	case "neighbors":
		if active {
			return discoverLocal(ctx)
		}
		script = `Get-NetNeighbor -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(224\.|239\.|255\.|0\.)' -and $_.LinkLayerAddress -and $_.LinkLayerAddress -ne '00-00-00-00-00-00' -and $_.LinkLayerAddress -ne 'FF-FF-FF-FF-FF-FF' } | ForEach-Object {[pscustomobject]@{ip=$_.IPAddress;mac=$_.LinkLayerAddress;state=[string]$_.State;interface=$_.InterfaceAlias;source='windows-neighbor-cache';rtt=$null}}`
		msg = "جدول الجيران الذي يحتفظ به ويندوز؛ قد يتضمن سجلات سابقة ولا يمثل حصرًا لجميع الأجهزة."
	case "ports":
		script = `$procs=@{}; Get-Process -ErrorAction SilentlyContinue | ForEach-Object {$procs[[int]$_.Id]=$_.ProcessName}; Get-NetTCPConnection -ErrorAction SilentlyContinue | ForEach-Object {[pscustomobject]@{Protocol='TCP';LocalAddress=$_.LocalAddress;LocalPort=$_.LocalPort;RemoteAddress=$_.RemoteAddress;RemotePort=$_.RemotePort;State=[string]$_.State;PID=$_.OwningProcess;Process=$procs[[int]$_.OwningProcess]}}; Get-NetUDPEndpoint -ErrorAction SilentlyContinue | ForEach-Object {[pscustomobject]@{Protocol='UDP';LocalAddress=$_.LocalAddress;LocalPort=$_.LocalPort;RemoteAddress='';RemotePort=$null;State='Listening';PID=$_.OwningProcess;Process=$procs[[int]$_.OwningProcess]}}`
		msg = "منافذ واتصالات هذا الكمبيوتر فقط. ظهور منفذ لا يثبت أنه قابل للوصول من الإنترنت."
	case "hardware":
		script = `Get-CimInstance Win32_PnPEntity -Filter "PNPDeviceID LIKE 'USB%' OR PNPClass = 'Bluetooth' OR PNPClass = 'Net' OR PNPClass = 'Ports'" | ForEach-Object {[pscustomobject]@{Name=$_.Name;Class=$_.PNPClass;Status=$_.Status;Service=$_.Service;DeviceID=$_.PNPDeviceID}}`
		msg = "أجهزة USB والشبكات والبلوتوث ومنافذ الاتصال التي يتعرف عليها ويندوز."
	case "system":
		script = `$os=Get-CimInstance Win32_OperatingSystem; $cpu=Get-CimInstance Win32_Processor | Select-Object -First 1; [pscustomobject]@{Computer=$env:COMPUTERNAME;OS=$os.Caption;Build=$os.BuildNumber;CPU=$cpu.Name;MemoryGB=[math]::Round($os.TotalVisibleMemorySize/1MB,1);Architecture=$os.OSArchitecture;Boot=$os.LastBootUpTime.ToString('o')}`
		msg = "مواصفات النظام الفعلية؛ لا يقرأ البرنامج محتويات ملفاتك الشخصية."
	case "traffic":
		script = `Get-NetAdapterStatistics | ForEach-Object {[pscustomobject]@{Name=$_.Name;ReceivedBytes=$_.ReceivedBytes;SentBytes=$_.SentBytes;ReceivedErrors=$_.ReceivedPacketErrors;SentErrors=$_.OutboundPacketErrors}}`
		msg = "عدادات تراكمية منذ تهيئة المحول. معدل النقل يُحسب من قراءتين متتاليتين؛ ليست قراءة لمحتوى الحزم."
	case "security":
		script = `Get-NetFirewallProfile | ForEach-Object {[pscustomobject]@{Profile=[string]$_.Name;Enabled=[bool]$_.Enabled;Inbound=[string]$_.DefaultInboundAction;Outbound=[string]$_.DefaultOutboundAction}}`
		msg = "حالة ملفات جدار حماية ويندوز فقط؛ هذا الفحص لا يمثل تدقيقًا أمنيًا شاملًا."
	case "serial":
		script = `Get-CimInstance Win32_SerialPort | ForEach-Object {[pscustomobject]@{Port=$_.DeviceID;Name=$_.Name;Description=$_.Description;Status=$_.Status}}`
		msg = "عرض المنافذ التسلسلية التي يعرّفها ويندوز؛ لا يفتح البرنامج المنفذ ولا يكتب إلى اللوحة."
	default:
		return nil, "", errors.New("نوع الفحص غير معروف")
	}
	rows, e := psJSON(ctx, script)
	if id == "neighbors" && e == nil {
		for _, row := range rows {
			row["source"] = "جدول الجيران في ويندوز"
		}
	}
	return rows, msg, e
}
func discoverLocal(ctx context.Context) (any, string, error) {
	// Use the preferred default route instead of probing every attached network.
	rows, e := psJSON(ctx, `$r=Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1; if($r){Get-NetIPAddress -InterfaceIndex $r.InterfaceIndex -AddressFamily IPv4 | Where-Object {$_.IPAddress -notmatch '^127\.'} | Select-Object -First 1 | ForEach-Object {[pscustomobject]@{IP=$_.IPAddress;Prefix=$_.PrefixLength;Interface=$_.InterfaceAlias}}}`)
	if e != nil {
		return nil, "", e
	}
	if len(rows) == 0 {
		return nil, "", errors.New("لا توجد شبكة IPv4 محلية متصلة مع بوابة افتراضية")
	}
	ip := net.ParseIP(fmt.Sprint(rows[0]["IP"]))
	prefix, ok := rows[0]["Prefix"].(float64)
	if !ok {
		return nil, "", errors.New("تعذر تحديد نطاق الشبكة المحلية")
	}
	targets, scope, e := boundedSubnet(ip, net.CIDRMask(int(prefix), 32))
	if e != nil {
		return nil, "", e
	}
	type seen struct {
		ip  string
		rtt float64
	}
	found := []seen{}
	var mu sync.Mutex
	jobs := make(chan net.IP)
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			h, _, _ := icmpCreateFile.Call()
			if h == 0 || h == ^uintptr(0) {
				return
			}
			defer icmpCloseHandle.Call(h)
			for target := range jobs {
				if ctx.Err() != nil {
					return
				}
				if rtt, ok := pingLocal(h, target); ok {
					mu.Lock()
					found = append(found, seen{target.String(), rtt})
					mu.Unlock()
				}
			}
		}()
	}
	for _, target := range targets {
		select {
		case jobs <- target:
		case <-ctx.Done():
			close(jobs)
			wg.Wait()
			return nil, "", errors.New("أُوقف الاكتشاف المحلي")
		}
	}
	close(jobs)
	wg.Wait()
	data, _, e := collect(ctx, "neighbors", false)
	if e != nil {
		return nil, "", e
	}
	neighbors, _ := data.([]map[string]any)
	byIP := map[string]map[string]any{}
	for _, n := range neighbors {
		p := net.ParseIP(fmt.Sprint(n["ip"]))
		if p != nil {
			_, block, _ := net.ParseCIDR(scope)
			if block.Contains(p) {
				byIP[p.String()] = n
			}
		}
	}
	for _, v := range found {
		n, ok := byIP[v.ip]
		if !ok {
			n = map[string]any{"ip": v.ip, "mac": "", "interface": rows[0]["Interface"]}
			byIP[v.ip] = n
		}
		n["state"] = "استجاب"
		n["source"] = "فحص استجابة محلي"
		n["rtt"] = v.rtt
	}
	result := []map[string]any{}
	for _, n := range byIP {
		result = append(result, n)
	}
	return result, fmt.Sprintf("نطاق الاكتشاف: %s — فُحص حتى %d عنوانًا. قد تحجب بعض الأجهزة الرد؛ سجلات جدول الجيران قد تكون سابقة.", scope, len(targets)), nil
}

var icmpDLL = syscall.NewLazyDLL("iphlpapi.dll")
var icmpCreateFile = icmpDLL.NewProc("IcmpCreateFile")
var icmpCloseHandle = icmpDLL.NewProc("IcmpCloseHandle")
var icmpSendEcho = icmpDLL.NewProc("IcmpSendEcho")

func pingLocal(h uintptr, ip net.IP) (float64, bool) {
	v := ip.To4()
	if v == nil {
		return 0, false
	}
	addr := uint32(v[0]) | uint32(v[1])<<8 | uint32(v[2])<<16 | uint32(v[3])<<24
	payload := []byte("Mirsad-local-diagnostic")
	reply := make([]byte, 256)
	n, _, _ := icmpSendEcho.Call(h, uintptr(addr), uintptr(unsafe.Pointer(&payload[0])), uintptr(len(payload)), 0, uintptr(unsafe.Pointer(&reply[0])), uintptr(len(reply)), 350)
	if n == 0 {
		return 0, false
	}
	status := *(*uint32)(unsafe.Pointer(&reply[4]))
	rtt := *(*uint32)(unsafe.Pointer(&reply[8]))
	return float64(rtt), status == 0
}
func showError(text string) {
	dll := syscall.NewLazyDLL("user32.dll")
	p := dll.NewProc("MessageBoxW")
	_, _, _ = p.Call(0, uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(text))), uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("مرصد الكمبيوتر"))), 0x10|0x100000|0x80000)
}
func launchUI(url, dataDir string) error {
	paths := []string{filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"), filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"), filepath.Join(os.Getenv("LOCALAPPDATA"), "Microsoft", "Edge", "Application", "msedge.exe")}
	for _, p := range paths {
		if _, e := os.Stat(p); e == nil {
			c := windowsCommand(context.Background(), p, "--app="+url, "--window-size=1380,900", "--user-data-dir="+filepath.Join(dataDir, "Interface"), "--no-first-run", "--disable-background-networking", "--disable-sync", "--disable-translate", "--disable-component-update", "--disable-features=msEdgeSidebarV2,msEdgeShopping,msEdgeCollections")
			if e = c.Start(); e == nil {
				go c.Wait()
				return nil
			}
		}
	}
	return errors.New("تحتاج واجهة البرنامج إلى Microsoft Edge الموجود عادةً في ويندوز 10 و11. لم يُنزّل البرنامج أي متصفح تلقائيًا")
}
func openSettings(page string) error {
	targets := map[string]string{"wifi": "ms-settings:network-wifi", "bluetooth": "ms-settings:bluetooth", "location": "ms-settings:privacy-location", "network": "ms-settings:network-status", "firewall": "windowsdefender://network"}
	u, ok := targets[page]
	if !ok {
		return errors.New("صفحة إعدادات غير معروفة")
	}
	dll := syscall.NewLazyDLL("shell32.dll")
	p := dll.NewProc("ShellExecuteW")
	v, _, _ := p.Call(0, uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("open"))), uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(u))), 0, 0, 1)
	if v <= 32 {
		return errors.New("تعذر فتح إعدادات ويندوز")
	}
	return nil
}

func uninstallApp() {
	msg := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	answer, _, _ := msg.Call(0, uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("هل تريد إزالة مرصد الكمبيوتر؟ تبقى التقارير وبيانات الفحص المحفوظة في مجلد المستخدم."))), uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("إزالة مرصد الكمبيوتر"))), 4|0x20|0x100000|0x80000)
	if answer != 6 {
		return
	}
	// A built-in Windows child process waits for this executable to exit before removal.
	script := `$ErrorActionPreference='Stop'; Start-Sleep -Seconds 2; $p=Join-Path $env:LOCALAPPDATA 'Programs\Mirsad'; $target=Join-Path $p 'Mirsad.exe'; Get-CimInstance Win32_Process -Filter "Name='Mirsad.exe'" | Where-Object {$_.ExecutablePath -eq $target} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}; Start-Sleep -Milliseconds 500; $linkName= -join [char[]](1605,1585,1589,1583,32,1575,1604,1603,1605,1576,1610,1608,1578,1585,46,108,110,107); $w=New-Object -ComObject WScript.Shell; foreach($f in @($w.SpecialFolders.Item('Desktop'),$w.SpecialFolders.Item('Programs'))){$link=Join-Path $f $linkName; if(Test-Path -LiteralPath $link){Remove-Item -LiteralPath $link -Force}}; if(Test-Path -LiteralPath $p){Remove-Item -LiteralPath $p -Recurse -Force}; Remove-Item -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MirsadDesktop' -Recurse -Force -ErrorAction SilentlyContinue`
	c := windowsCommand(context.Background(), "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script)
	if e := c.Start(); e != nil {
		showError("تعذر بدء إزالة البرنامج. أغلق جميع نسخه ثم أعد المحاولة")
	}
}

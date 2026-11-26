package main

import (
	"context"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"
)

const version = "1.0.0"

type WifiNetwork struct {
	SSID       string    `json:"ssid"`
	BSSID      string    `json:"bssid"`
	Signal     int       `json:"signal"`
	RSSI       int32     `json:"rssi"`
	Channel    int       `json:"channel"`
	Frequency  uint32    `json:"frequency"`
	Band       string    `json:"band"`
	Security   string    `json:"security"`
	Adapter    string    `json:"adapter"`
	Cached     bool      `json:"cached"`
	ObservedAt time.Time `json:"observedAt"`
}
type BluetoothDevice struct {
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	Kind      string    `json:"kind"`
	Connected bool      `json:"connected"`
	Paired    bool      `json:"paired"`
	RSSI      *int16    `json:"rssi"`
	SeenAt    time.Time `json:"seenAt"`
}
type Neighbor struct {
	IP        string   `json:"ip"`
	MAC       string   `json:"mac"`
	State     string   `json:"state"`
	Interface string   `json:"interface"`
	Source    string   `json:"source"`
	RTT       *float64 `json:"rtt"`
}
type Section struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	UpdatedAt time.Time `json:"updatedAt"`
	Data      any       `json:"data"`
}
type LogEntry struct {
	Time  time.Time `json:"time"`
	Text  string    `json:"text"`
	Level string    `json:"level"`
}
type Capability struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Detail string `json:"detail"`
}
type Point struct {
	Time   time.Time `json:"time"`
	RSSI   int32     `json:"rssi"`
	Signal int       `json:"signal"`
}
type Snapshot struct {
	Version      string             `json:"version"`
	Platform     string             `json:"platform"`
	StartedAt    time.Time          `json:"startedAt"`
	Sections     map[string]Section `json:"sections"`
	Logs         []LogEntry         `json:"logs"`
	History      map[string][]Point `json:"history"`
	Capabilities []Capability       `json:"capabilities"`
	Installing   bool               `json:"installing"`
	Installed    bool               `json:"installed"`
}
type App struct {
	mu      sync.RWMutex
	state   Snapshot
	jobs    map[string]context.CancelFunc
	ctx     context.Context
	cancel  context.CancelFunc
	dataDir string
}

var sectionNames = map[string]string{"wifi": "الواي فاي", "bluetooth": "البلوتوث", "adapters": "محولات الشبكة", "neighbors": "الأجهزة المحلية", "ports": "المنافذ والاتصالات", "hardware": "الأجهزة المتصلة", "system": "معلومات الكمبيوتر", "traffic": "حركة الشبكة", "security": "حالة الحماية", "serial": "المنافذ التسلسلية"}
var sectionOrder = []string{"system", "adapters", "wifi", "neighbors", "bluetooth", "ports", "hardware", "traffic", "security", "serial"}

func NewApp(dataDir string, installing bool) *App {
	ctx, cancel := context.WithCancel(context.Background())
	a := &App{ctx: ctx, cancel: cancel, dataDir: dataDir, jobs: make(map[string]context.CancelFunc)}
	a.state = Snapshot{Version: version, Platform: platformName(), StartedAt: time.Now(), Sections: make(map[string]Section), Logs: []LogEntry{}, History: make(map[string][]Point), Installing: installing, Installed: isInstalled(), Capabilities: capabilities()}
	for _, id := range sectionOrder {
		a.state.Sections[id] = Section{ID: id, Status: "idle", Message: "لم يبدأ الفحص بعد", Data: []any{}}
	}
	return a
}
func capabilities() []Capability {
	return []Capability{
		{"wifi", "مسح الواي فاي", "supported", "قراءة نقاط الوصول وقوة الإشارة والقنوات عبر واجهة ويندوز؛ يتطلب بطاقة واي فاي وصلاحية الموقع وفق إصدار النظام."},
		{"bluetooth", "بلوتوث وبلوتوث منخفض الطاقة", "supported", "اكتشاف الأجهزة القابلة للظهور وقراءة إعلانات البلوتوث منخفض الطاقة عند دعم البطاقة وبرنامج التشغيل؛ قوة الإشارة لا تحدد المسافة."},
		{"network", "محولات الشبكة والاتصالات", "supported", "العناوين والبوابة وملقمات الأسماء والمنافذ المحلية والعدادات باستخدام أدوات ويندوز."},
		{"lan", "اكتشاف الشبكة المحلية", "supported", "قراءة جدول الجيران، مع اكتشاف نشط اختياري ومحدود بشبكة IPv4 خاصة واحدة وحتى 254 عنوانًا؛ قد لا ترد بعض الأجهزة."},
		{"channels", "القنوات وتتبع الإشارة", "supported", "توزيع الشبكات المرئية حسب قنوات واي فاي وتاريخ القراءات الجديدة. هذا توزيع للشبكات، وليس قياسًا للطيف الراديوي."},
		{"usb", "الأجهزة ومنافذ الاتصال", "supported", "قراءة أجهزة USB والأجهزة المعروفة للنظام ومنافذ الاتصال التسلسلية دون إرسال أوامر إليها."},
		{"reports", "التقارير والأرشفة", "supported", "تصدير عربي محلي بصيغ HTML وJSON وCSV وحفظ لقطات الفحص. لا تُجمع كلمات مرور الواي فاي ولا يُرسل التقرير إلى جهة خارجية."},
		{"ir", "التقاط وإرسال الأشعة تحت الحمراء", "hardware", "يتطلب مرسلًا ومستقبلًا متوافقين وتعريفًا وبروتوكولًا محددين؛ التحكم بهذه القطع غير مدمج في هذا الإصدار."},
		{"rf", "راديو دون جيجاهرتز وتحليل الطيف", "hardware", "يتطلب وحدات راديو متخصصة. بطاقة الواي فاي العادية لا تقوم مقام CC1101 أو جهاز قياس طيف؛ دعم هذه الوحدات غير مدمج."},
		{"gps", "الموقع عبر مستقبل ملاحة", "hardware", "يتطلب مستقبلًا متوافقًا. لا يستنتج البرنامج موقع الأجهزة أو اتجاهها من قوة الإشارة."},
		{"packets", "قراءة محتوى حزم الشبكة", "unavailable", "المتاح عدادات الحركة والاتصالات المحلية. التقاط محتوى الحزم غير مدمج، ويحتاج عادةً صلاحيات أو برنامج تشغيل إضافيًا."},
		{"firmware", "تثبيت برامج اللوحات الإلكترونية", "unavailable", "غير مدمج: يحتاج تحديد اللوحة والتوصيلات وملف البرنامج وطريقة التثبيت. وجود منفذ USB وحده لا يثبت التوافق."},
		{"disruption", "التشويش وفصل الاتصالات والبوابات المضللة", "excluded", "هذه الوظائف غير مضافة. البرنامج مخصص للقراءة والتشخيص؛ لا يقطع اتصالات الأجهزة ولا ينشئ بوابات لجمع بيانات الدخول."},
		{"weather", "الطقس والخرائط عبر الإنترنت", "excluded", "لم تُربط خدمات إنترنت التزامًا بالتشغيل المحلي دون خدمات خارجية."},
	}
}
func (a *App) logLocked(text, level string) {
	a.state.Logs = append(a.state.Logs, LogEntry{time.Now(), text, level})
	if len(a.state.Logs) > 200 {
		a.state.Logs = a.state.Logs[len(a.state.Logs)-200:]
	}
}
func (a *App) Start(id string, active bool) bool {
	if _, ok := sectionNames[id]; !ok {
		return false
	}
	a.mu.Lock()
	if _, ok := a.jobs[id]; ok {
		a.mu.Unlock()
		return false
	}
	ctx, cancel := context.WithTimeout(a.ctx, 40*time.Second)
	a.jobs[id] = cancel
	s := a.state.Sections[id]
	s.Status = "running"
	s.Message = "جارٍ قراءة بيانات الجهاز…"
	a.state.Sections[id] = s
	a.logLocked("بدأ فحص "+sectionNames[id], "info")
	a.mu.Unlock()
	go func() {
		defer cancel()
		data, msg, err := collect(ctx, id, active)
		a.mu.Lock()
		defer a.mu.Unlock()
		delete(a.jobs, id)
		s := a.state.Sections[id]
		if err != nil {
			s.Status = "error"
			s.Message = err.Error()
			a.logLocked("تعذر فحص "+sectionNames[id]+": "+s.Message, "error")
			// Keep earlier data with its original measurement time. The UI labels it as previous.
		} else {
			s.Status = "ready"
			s.Message = msg
			s.Data = data
			s.UpdatedAt = time.Now()
			if rows, ok := data.([]WifiNetwork); ok {
				for _, n := range rows {
					if !n.Cached {
						key := n.Adapter + "|" + n.BSSID
						p := Point{n.ObservedAt, n.RSSI, n.Signal}
						h := a.state.History[key]
						if len(h) == 0 || !h[len(h)-1].Time.Equal(p.Time) {
							h = append(h, p)
							if len(h) > 120 {
								h = h[len(h)-120:]
							}
							a.state.History[key] = h
						}
					}
				}
			}
			a.logLocked("اكتمل فحص "+sectionNames[id], "success")
		}
		a.state.Sections[id] = s
	}()
	return true
}
func (a *App) Stop() {
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, cancel := range a.jobs {
		cancel()
	}
	a.logLocked("طُلب إيقاف الفحوص الجارية", "info")
}
func (a *App) State() Snapshot {
	a.mu.RLock()
	defer a.mu.RUnlock()
	s := a.state
	s.Sections = make(map[string]Section, len(a.state.Sections))
	for k, v := range a.state.Sections {
		s.Sections[k] = v
	}
	s.Logs = append([]LogEntry{}, a.state.Logs...)
	s.History = make(map[string][]Point, len(a.state.History))
	for k, v := range a.state.History {
		s.History[k] = append([]Point{}, v...)
	}
	return s
}
func frequencyChannel(khz uint32) (int, string) {
	mhz := int(khz / 1000)
	switch {
	case mhz == 2484:
		return 14, "2.4"
	case mhz >= 2412 && mhz <= 2472:
		return (mhz - 2407) / 5, "2.4"
	case mhz == 5935:
		return 2, "6"
	case mhz >= 5955 && mhz <= 7115:
		return (mhz - 5950) / 5, "6"
	case mhz >= 5000 && mhz <= 5895:
		return (mhz - 5000) / 5, "5"
	}
	return 0, "غير معروف"
}
func bluetoothAddress(v uint64) string {
	b := make([]string, 6)
	for i := 0; i < 6; i++ {
		b[5-i] = fmt.Sprintf("%02X", byte(v>>uint(i*8)))
	}
	return strings.Join(b, ":")
}
func boundedSubnet(ip net.IP, mask net.IPMask) ([]net.IP, string, error) {
	v4 := ip.To4()
	ones, bits := mask.Size()
	if v4 == nil || bits != 32 || ones < 0 || (!v4.IsPrivate() && !v4.IsLinkLocalUnicast()) {
		return nil, "", fmt.Errorf("الاكتشاف النشط مخصص لشبكة IPv4 محلية خاصة")
	}
	if ones >= 31 {
		return nil, "", fmt.Errorf("هذه الشبكة لا تحتوي نطاق اكتشاف مناسبًا")
	}
	if ones < 24 {
		mask = net.CIDRMask(24, 32)
	}
	network := v4.Mask(mask)
	count := 1 << uint(32-max(ones, 24))
	out := []net.IP{}
	base := uint32(network[0])<<24 | uint32(network[1])<<16 | uint32(network[2])<<8 | uint32(network[3])
	for i := 1; i < count-1; i++ {
		v := base + uint32(i)
		p := net.IPv4(byte(v>>24), byte(v>>16), byte(v>>8), byte(v))
		if !p.Equal(v4) {
			out = append(out, p)
		}
	}
	return out, (&net.IPNet{IP: network, Mask: mask}).String(), nil
}
func sortWifi(rows []WifiNetwork) {
	sort.Slice(rows, func(i, j int) bool { return rows[i].Signal > rows[j].Signal })
}

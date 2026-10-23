import com.q8ux.antalshaer.BrowserPolicy;
public final class PolicySelfTest {
    private static void check(boolean value, String name) { if (!value) throw new AssertionError(name); }
    public static void main(String[] args) {
        check(BrowserPolicy.isAppUrl(BrowserPolicy.START_URL),"start URL");
        check(BrowserPolicy.isAppUrl("https://q8-ux.github.io/saad/ant-alshaer/index.html?x=1#write"),"own page");
        for (String url : new String[]{"http://q8-ux.github.io/saad/ant-alshaer/","https://evil.example/saad/ant-alshaer/","https://q8-ux.github.io.evil.example/saad/ant-alshaer/","https://q8-ux.github.io@evil.example/saad/ant-alshaer/","https://q8-ux.github.io:444/saad/ant-alshaer/","https://q8-ux.github.io/saad/other/","https://q8-ux.github.io/saad/ant-alshaer/../other/","https://q8-ux.github.io/saad/ant-alshaer/%2e%2e/other/","file:///etc/passwd","javascript:alert(1)","not a URL"}) check(!BrowserPolicy.isAppUrl(url),"blocked navigation: "+url);
        check(BrowserPolicy.safeFilename("../../قصيدتي.svg").equals("_.._قصيدتي.svg"),"filename traversal");
        check(BrowserPolicy.safeFilename("").equals("ant-alshaer-export"),"empty filename");
        check(BrowserPolicy.safeMime("text/plain;charset=UTF-8").equals("text/plain"),"text MIME");
        check(BrowserPolicy.safeMime("image/svg+xml").equals("image/svg+xml"),"poem card MIME");
        check(BrowserPolicy.safeMime("text/html").equals("application/octet-stream"),"untrusted MIME");
        check(BrowserPolicy.validExportSize(0) && BrowserPolicy.validExportSize(128L*1024*1024),"export boundaries");
        check(!BrowserPolicy.validExportSize(-1) && !BrowserPolicy.validExportSize(128L*1024*1024+1),"export limits");
        System.out.println("Browser policy checks passed");
    }
}

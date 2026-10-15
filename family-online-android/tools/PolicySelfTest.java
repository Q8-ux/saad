import com.saadrawdan.writingstudio.BrowserPolicy;
public final class PolicySelfTest {
    private static void check(boolean value, String name) { if (!value) throw new AssertionError(name); }
    public static void main(String[] args) {
        check(BrowserPolicy.isAppUrl(BrowserPolicy.START_URL),"start URL");
        check(BrowserPolicy.isAppUrl("https://q8-ux.github.io/saad/family-online-studio/index.html?x=1#read"),"own page");
        for (String url : new String[]{"http://q8-ux.github.io/saad/family-online-studio/","https://evil.example/saad/family-online-studio/","https://q8-ux.github.io.evil.example/saad/family-online-studio/","https://q8-ux.github.io@evil.example/saad/family-online-studio/","https://q8-ux.github.io:444/saad/family-online-studio/","https://q8-ux.github.io/saad/other/","https://q8-ux.github.io/saad/family-online-studio/../other/","https://q8-ux.github.io/saad/family-online-studio/%2e%2e/other/","file:///etc/passwd","javascript:alert(1)","not a URL"}) check(!BrowserPolicy.isAppUrl(url),"blocked navigation: "+url);
        check(BrowserPolicy.safeFilename("../../نص المسرحية.docx").equals("_.._نص المسرحية.docx"),"filename traversal");
        check(BrowserPolicy.safeFilename("").equals("writing-studio-export"),"empty filename");
        check(BrowserPolicy.safeMime("text/plain;charset=UTF-8").equals("text/plain"),"text MIME");
        check(BrowserPolicy.safeMime("text/html").equals("application/octet-stream"),"untrusted MIME");
        check(BrowserPolicy.validExportSize(0) && BrowserPolicy.validExportSize(20L*1024*1024),"export boundaries");
        check(!BrowserPolicy.validExportSize(-1) && !BrowserPolicy.validExportSize(20L*1024*1024+1),"export limits");
        System.out.println("Browser policy checks passed");
    }
}

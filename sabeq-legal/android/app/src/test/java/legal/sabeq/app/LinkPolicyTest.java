package legal.sabeq.app;
import org.junit.Test;
import static org.junit.Assert.*;
public class LinkPolicyTest {
 @Test public void onlySabeqStaysInside(){assertTrue(LinkPolicy.trusted(LinkPolicy.HOME));assertTrue(LinkPolicy.trusted(LinkPolicy.HOME+"source.html?page=906"));for(String u:new String[]{"http://q8-ux.github.io/saad/sabeq-legal/","https://q8-ux.github.io/saad/other/","https://q8-ux.github.io/saad/sabeq-legal/../other/","https://q8-ux.github.io/saad/sabeq-legal/%2e%2e/other/","https://q8-ux.github.io.evil.test/saad/sabeq-legal/","https://evil@q8-ux.github.io/saad/sabeq-legal/","file:///sdcard/test.html","javascript:alert(1)"})assertFalse(u,LinkPolicy.trusted(u));}
 @Test public void noExecutableOrLocalExternalIntents(){assertTrue(LinkPolicy.external("https://www.sabeq.legal/"));assertTrue(LinkPolicy.external("tel:+96500000000"));for(String u:new String[]{"file:///data/a","intent://data","javascript:x","http://example.org/"})assertFalse(LinkPolicy.external(u));}
 @Test public void exportsAreBoundedTypes(){assertEquals(".docx",LinkPolicy.extension("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));assertNull(LinkPolicy.exportMime("application/vnd.android.package-archive"));assertEquals("text/plain",LinkPolicy.exportMime("text/plain;charset=utf-8"));assertTrue(LinkPolicy.blob("blob:https://q8-ux.github.io/id"));assertFalse(LinkPolicy.blob("blob:https://evil.test/id"));}
}

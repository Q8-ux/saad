package legal.sabeq.app;
import java.net.URI;
import java.util.Locale;
public final class LinkPolicy {
 public static final String HOME="https://q8-ux.github.io/saad/sabeq-legal/";
 public static boolean trusted(String value){
  try {URI u=URI.create(value);String p=u.getPath();return "https".equalsIgnoreCase(u.getScheme())&&"q8-ux.github.io".equalsIgnoreCase(u.getHost())&&u.getUserInfo()==null&&(u.getPort()==-1||u.getPort()==443)&&p!=null&&(p.equals("/saad/sabeq-legal/")||p.startsWith("/saad/sabeq-legal/"))&&!p.contains("/../")&&!p.contains("/./")&&!p.contains("\\");}catch(Exception e){return false;}
 }
 public static boolean external(String value){try{String s=URI.create(value).getScheme();return s!=null&&(s.equals("https")||s.equals("tel")||s.equals("mailto"));}catch(Exception e){return false;}}
 public static boolean blob(String value){return value!=null&&value.startsWith("blob:https://q8-ux.github.io/");}
 public static String exportMime(String value){String s=value==null?"":value.toLowerCase(Locale.ROOT).split(";",2)[0];switch(s){case "application/pdf":case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":case "application/msword":case "text/plain":case "text/html":case "application/json":case "application/zip":case "image/png":return s;default:return null;}}
 public static String extension(String mime){switch(mime){case "application/pdf":return ".pdf";case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":return ".docx";case "application/msword":return ".doc";case "text/html":return ".html";case "application/json":return ".json";case "application/zip":return ".zip";case "image/png":return ".png";default:return ".txt";}}
 private LinkPolicy(){}
}

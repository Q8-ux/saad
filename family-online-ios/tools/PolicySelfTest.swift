import Foundation

@main enum PolicySelfTest {
    static func main() {
        precondition(StudioPolicy.appURL(StudioPolicy.startURL))
        let blocked = ["http://q8-ux.github.io/saad/family-online-studio/", "https://q8-ux.github.io.evil.example/saad/family-online-studio/", "https://q8-ux.github.io@evil.example/saad/family-online-studio/", "https://q8-ux.github.io:444/saad/family-online-studio/", "https://q8-ux.github.io/saad/other/", "https://q8-ux.github.io/saad/family-online-studio/../other/", "https://q8-ux.github.io/saad/family-online-studio/%2e%2e/other/", "https://q8-ux.github.io/saad/family-online-studio/%252e%252e/other/", "file:///etc/passwd"]
        for value in blocked { precondition(!StudioPolicy.appURL(URL(string: value)), value) }
        precondition(StudioPolicy.filename("../../نص المسرحية.docx") == "_.._نص المسرحية.docx")
        precondition(StudioPolicy.filename("") == "writing-studio-export")
        precondition(StudioPolicy.validExportSize(0))
        precondition(StudioPolicy.validExportSize(20*1024*1024))
        precondition(!StudioPolicy.validExportSize(-1))
        precondition(!StudioPolicy.validExportSize(20*1024*1024+1))
        print("Swift navigation, filename and export policy passed")
    }
}

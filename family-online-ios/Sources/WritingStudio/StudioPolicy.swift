import Foundation

enum StudioPolicy {
    static let origin = "https://q8-ux.github.io"
    static let rootPath = "/saad/family-online-studio/"
    static let startURL = URL(string: origin + rootPath + "?app=ios&v=1")!
    static let maximumExportBytes = 20 * 1024 * 1024

    static func trustedOrigin(_ url: URL?) -> Bool {
        guard let url, let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return false }
        return c.scheme?.lowercased() == "https" && c.host?.lowercased() == "q8-ux.github.io"
            && c.user == nil && c.password == nil && (c.port == nil || c.port == 443)
    }

    static func appURL(_ url: URL?) -> Bool {
        guard trustedOrigin(url), let url,
              let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return false }
        let raw = c.percentEncodedPath.lowercased()
        guard !["%25", "%2f", "%5c"].contains(where: raw.contains) else { return false }
        let path = c.path
        return path.hasPrefix(rootPath) && !path.contains("\\")
            && !path.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) })
            && !path.split(separator: "/").contains(where: { $0 == "." || $0 == ".." })
    }

    static func filename(_ value: String) -> String {
        let forbidden = CharacterSet(charactersIn: "\\/:*?\"<>|").union(.controlCharacters)
        let scalars = value.precomposedStringWithCanonicalMapping.unicodeScalars.map { forbidden.contains($0) ? "_" : String($0) }
        var result = scalars.joined().trimmingCharacters(in: .whitespacesAndNewlines)
        while result.hasPrefix(".") { result.removeFirst() }
        if result.isEmpty { result = "writing-studio-export" }
        return String(result.prefix(120))
    }

    static func validExportSize(_ size: Int) -> Bool { (0...maximumExportBytes).contains(size) }
}

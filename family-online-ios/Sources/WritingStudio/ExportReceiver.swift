import Foundation

final class ExportReceiver {
    let id: String
    let url: URL
    let expected: Int
    private var handle: FileHandle?
    private var received = 0
    private var sequence = 0
    private var retained = false

    init(id: String, filename: String, size: Int) throws {
        guard StudioPolicy.validExportSize(size), id.range(of: "^[A-Za-z0-9-]{1,80}$", options: .regularExpression) != nil else {
            throw ExportError.invalid
        }
        self.id = id
        expected = size
        var folder = FileManager.default.temporaryDirectory.appendingPathComponent("studio-export-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try folder.setResourceValues(values)
        url = folder.appendingPathComponent(StudioPolicy.filename(filename))
        guard FileManager.default.createFile(atPath: url.path, contents: nil, attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]) else {
            throw ExportError.invalid
        }
        handle = try FileHandle(forWritingTo: url)
    }

    func append(id: String, sequence: Int, base64: String) throws {
        guard id == self.id, sequence == self.sequence, base64.count <= 44000,
              let bytes = Data(base64Encoded: base64), bytes.count <= 32768,
              received + bytes.count <= expected, let handle else { throw ExportError.invalid }
        try handle.write(contentsOf: bytes)
        received += bytes.count
        self.sequence += 1
    }

    func finish(id: String) throws -> URL {
        guard id == self.id, received == expected else { throw ExportError.invalid }
        try handle?.close()
        handle = nil
        retained = true
        return url
    }

    func cancel() { try? handle?.close(); handle = nil; Self.remove(url) }
    static func remove(_ url: URL) { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
    deinit { if !retained { cancel() } }
    enum ExportError: Error { case invalid }
}

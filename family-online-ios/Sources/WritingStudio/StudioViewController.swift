import UIKit
import WebKit
import AVFoundation

final class StudioViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIDocumentPickerDelegate {
    private var webView: WKWebView!
    private let progress = UIProgressView(progressViewStyle: .bar)
    private let errorPanel = UIStackView()
    private var observation: NSKeyValueObservation?
    private let speech = AVSpeechSynthesizer()
    private var receiving: ExportReceiver?
    private var pendingFile: URL?
    private var bridge: WeakStudioHandler?
    private let ink = UIColor(red: 20/255, green: 43/255, blue: 62/255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ink
        view.semanticContentAttribute = .forceRightToLeft
        view.accessibilityIdentifier = "studio-container"
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "WritingStudioIOS/1.0"
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = [.audio, .video]
        let handler = WeakStudioHandler(self)
        bridge = handler
        configuration.userContentController.add(handler, name: "studioNative")
        if let url = Bundle.main.url(forResource: "native-bridge", withExtension: "js"), let script = try? String(contentsOf: url, encoding: .utf8) {
            configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isInspectable = false
        webView.accessibilityIdentifier = "studio-webview"
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 237/255, green: 242/255, blue: 244/255, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor), webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor), webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        progress.progressTintColor = UIColor(red: 8/255, green: 127/255, blue: 124/255, alpha: 1)
        progress.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(progress)
        NSLayoutConstraint.activate([progress.topAnchor.constraint(equalTo: view.topAnchor), progress.leadingAnchor.constraint(equalTo: view.leadingAnchor), progress.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        observation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] browser, _ in
            self?.progress.progress = Float(browser.estimatedProgress)
            self?.progress.isHidden = browser.estimatedProgress >= 1
        }
        buildErrorPanel()
        removeOldExports()
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-smoke-test") {
            webView.loadHTMLString("<!doctype html><html lang='ar' dir='rtl'><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font:28px system-ui;padding:24px;background:#edf2f4'><h1>اختبار استوديو الكتابة</h1><p>المحرر جاهز للاختبار</p></body></html>", baseURL: StudioPolicy.startURL)
            return
        }
        #endif
        reloadEditor()
    }

    @objc private func reloadEditor() {
        errorPanel.isHidden = true
        webView.load(URLRequest(url: StudioPolicy.startURL))
    }

    func pauseActivities() {
        guard isViewLoaded else { return }
        webView.evaluateJavaScript("window.__FO_IOS_PAUSE__&&window.__FO_IOS_PAUSE__()", completionHandler: nil)
        speech.stopSpeaking(at: .immediate)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if action.targetFrame?.isMainFrame == false { decisionHandler(.allow); return }
        if StudioPolicy.appURL(url) { decisionHandler(.allow); return }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-smoke-test"), url.absoluteString == "about:blank" { decisionHandler(.allow); return }
        #endif
        if action.navigationType == .linkActivated { openExternal(url) }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if action.navigationType == .linkActivated, let url = action.request.url { openExternal(url) }
        return nil
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        receiving?.cancel(); receiving = nil
        speech.stopSpeaking(at: .immediate)
        errorPanel.isHidden = true
        progress.isHidden = false
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { progress.isHidden = true }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { navigationFailed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { navigationFailed(error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showErrorPanel() }

    private func navigationFailed(_ error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showErrorPanel() }
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        let allowed = origin.protocol == "https" && origin.host.lowercased() == "q8-ux.github.io"
            && (origin.port == 0 || origin.port == 443) && frame.isMainFrame
            && StudioPolicy.appURL(webView.url) && StudioPolicy.appURL(frame.request.url) && type == .microphone
        decisionHandler(allowed ? .prompt : .deny)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let origin = message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame, message.webView === webView, StudioPolicy.appURL(webView.url),
              origin.protocol == "https", origin.host.lowercased() == "q8-ux.github.io", origin.port == 0 || origin.port == 443,
              let value = message.body as? [String: Any],
              let encoded = try? JSONSerialization.data(withJSONObject: value), encoded.count <= 52000,
              let type = value["type"] as? String else { return }
        do {
            switch type {
            case "print": printDocument()
            case "tts-stop": speech.stopSpeaking(at: .immediate)
            case "tts-speak":
                if let text = value["text"] as? String, text.utf16.count <= 12000 { speak(text) }
            case "export-start":
                guard receiving == nil, pendingFile == nil, let id = value["id"] as? String,
                      let size = value["size"] as? NSNumber, size.doubleValue.rounded() == size.doubleValue,
                      size.doubleValue >= 0, size.doubleValue <= Double(StudioPolicy.maximumExportBytes) else { throw ExportReceiver.ExportError.invalid }
                receiving = try ExportReceiver(id: id, filename: value["name"] as? String ?? "writing-studio-export", size: size.intValue)
            case "export-chunk":
                guard let receiver = receiving, let id = value["id"] as? String, let sequence = value["sequence"] as? Int, let data = value["data"] as? String else { throw ExportReceiver.ExportError.invalid }
                try receiver.append(id: id, sequence: sequence, base64: data)
            case "export-end":
                guard let receiver = receiving, let id = value["id"] as? String, presentedViewController == nil else { throw ExportReceiver.ExportError.invalid }
                pendingFile = try receiver.finish(id: id)
                receiving = nil
                if let pendingFile {
                    let picker = UIDocumentPickerViewController(forExporting: [pendingFile], asCopy: true)
                    picker.delegate = self
                    picker.modalPresentationStyle = .formSheet
                    present(picker, animated: true)
                }
            case "export-cancel": receiving?.cancel(); receiving = nil
            default: break
            }
        } catch {
            receiving?.cancel(); receiving = nil
            exportResult(false)
            showAlert("لم يكتمل إعداد الملف للحفظ. أعد المحاولة.")
        }
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finishSaving(!urls.isEmpty) }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finishSaving(false) }

    private func finishSaving(_ saved: Bool) {
        if let pendingFile { ExportReceiver.remove(pendingFile) }
        pendingFile = nil
        exportResult(saved)
    }

    private func exportResult(_ ok: Bool) {
        guard StudioPolicy.appURL(webView.url) else { return }
        webView.evaluateJavaScript("window.__FO_IOS_EXPORT_RESULT__&&window.__FO_IOS_EXPORT_RESULT__(\(ok ? "true" : "false"))", completionHandler: nil)
    }

    private func printDocument() {
        guard presentedViewController == nil else { return }
        let printer = UIPrintInteractionController.shared
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = "استوديو الكتابة"
        info.outputType = .general
        info.orientation = .portrait
        printer.printInfo = info
        printer.printFormatter = webView.viewPrintFormatter()
        printer.present(from: CGRect(x: view.bounds.midX, y: view.bounds.maxY - 16, width: 1, height: 1), in: view, animated: true, completionHandler: nil)
    }

    private func speak(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        speech.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "ar-KW") ?? AVSpeechSynthesisVoice(language: "ar-SA")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        speech.speak(utterance)
    }

    private func openExternal(_ url: URL) {
        guard ["https", "mailto"].contains(url.scheme?.lowercased() ?? "") else { return }
        UIApplication.shared.open(url)
    }

    private func buildErrorPanel() {
        errorPanel.axis = .vertical
        errorPanel.spacing = 20
        errorPanel.alignment = .fill
        errorPanel.isLayoutMarginsRelativeArrangement = true
        errorPanel.layoutMargins = UIEdgeInsets(top: 32, left: 28, bottom: 32, right: 28)
        errorPanel.backgroundColor = UIColor(red: 237/255, green: 242/255, blue: 244/255, alpha: 1)
        errorPanel.translatesAutoresizingMaskIntoConstraints = false
        let title = UILabel()
        title.text = "استوديو الكتابة"
        title.font = .systemFont(ofSize: 30, weight: .bold)
        title.textColor = ink
        title.textAlignment = .center
        let description = UILabel()
        description.text = "تعذر تحميل المحرر. تحقق من الإنترنت ثم أعد المحاولة."
        description.font = .preferredFont(forTextStyle: .title3)
        description.adjustsFontForContentSizeCategory = true
        description.textColor = ink
        description.numberOfLines = 0
        description.textAlignment = .center
        let retry = UIButton(type: .system)
        retry.setTitle("إعادة المحاولة", for: .normal)
        retry.titleLabel?.font = .systemFont(ofSize: 22, weight: .semibold)
        retry.addTarget(self, action: #selector(reloadEditor), for: .touchUpInside)
        let browser = UIButton(type: .system)
        browser.setTitle("فتح الموقع في Safari", for: .normal)
        browser.titleLabel?.font = .systemFont(ofSize: 20)
        browser.addAction(UIAction { [weak self] _ in self?.openExternal(StudioPolicy.startURL) }, for: .touchUpInside)
        [title, description, retry, browser].forEach(errorPanel.addArrangedSubview)
        view.addSubview(errorPanel)
        NSLayoutConstraint.activate([errorPanel.centerYAnchor.constraint(equalTo: view.centerYAnchor), errorPanel.leadingAnchor.constraint(equalTo: view.leadingAnchor), errorPanel.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        errorPanel.isHidden = true
    }

    private func showErrorPanel() { progress.isHidden = true; errorPanel.isHidden = false }
    private func showAlert(_ message: String) {
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: "استوديو الكتابة", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "حسنًا", style: .default))
        present(alert, animated: true)
    }

    private func removeOldExports() {
        let root = FileManager.default.temporaryDirectory
        let folders = (try? FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: [.creationDateKey])) ?? []
        for folder in folders where folder.lastPathComponent.hasPrefix("studio-export-") {
            if let date = try? folder.resourceValues(forKeys: [.creationDateKey]).creationDate, Date().timeIntervalSince(date) > 86400 { try? FileManager.default.removeItem(at: folder) }
        }
    }

    deinit { observation?.invalidate(); if let pendingFile { ExportReceiver.remove(pendingFile) } }
}

private final class WeakStudioHandler: NSObject, WKScriptMessageHandler {
    private weak var owner: StudioViewController?
    init(_ owner: StudioViewController) { self.owner = owner }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.userContentController(userContentController, didReceive: message)
    }
}

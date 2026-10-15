import XCTest

final class StudioLaunchTests: XCTestCase {
    func testArabicEditorContainerLaunches() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-smoke-test"]
        app.launch()
        XCTAssertTrue(app.webViews["studio-webview"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.webViews.staticTexts["اختبار استوديو الكتابة"].waitForExistence(timeout: 20))
        XCTAssertEqual(app.state, .runningForeground)
    }
}

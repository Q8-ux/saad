import SwiftUI

@main
struct WritingStudioApp: App {
    var body: some Scene {
        WindowGroup { StudioRootView().environment(\.layoutDirection, .rightToLeft) }
    }
}

@MainActor
private final class StudioSession: ObservableObject {
    let controller = StudioViewController()
}

private struct StudioRootView: View {
    @StateObject private var session = StudioSession()
    @Environment(\.scenePhase) private var phase
    var body: some View {
        StudioContainer(controller: session.controller)
            .background(Color(red: 20/255, green: 43/255, blue: 62/255).ignoresSafeArea())
            .onChange(of: phase) { value in
                if value != .active { session.controller.pauseActivities() }
            }
    }
}

private struct StudioContainer: UIViewControllerRepresentable {
    let controller: StudioViewController
    func makeUIViewController(context: Context) -> StudioViewController { controller }
    func updateUIViewController(_ uiViewController: StudioViewController, context: Context) { }
}

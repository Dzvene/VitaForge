import SwiftUI

@main
struct VitaForgeApp: App {
    @StateObject private var session = Session()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .tint(.brand)
                .task { await session.bootstrap() }
        }
    }
}

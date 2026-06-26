import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: Session

    var body: some View {
        switch session.route {
        case .loading:
            ProgressView().controlSize(.large)
        case .unauthenticated:
            AuthView()
        case .onboarding:
            OnboardingView()
        case .ready:
            MainTabView()
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Today", systemImage: "circle.dashed") }
            DiaryView()
                .tabItem { Label("Diary", systemImage: "book") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

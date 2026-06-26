import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var session: Session

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    if let user = session.user {
                        LabeledContent("Email", value: user.email)
                        if !user.emailVerified {
                            Label("Email not verified", systemImage: "envelope.badge")
                                .foregroundStyle(Color.fatColor)
                        }
                    }
                }

                Section("Language") {
                    Picker("App language", selection: Binding(
                        get: { session.language },
                        set: { session.setLanguage($0) }
                    )) {
                        ForEach(AppLanguage.allCases) { Text($0.display).tag($0) }
                    }
                }

                Section {
                    Button(role: .destructive) { session.logout() } label: {
                        Text("Sign out")
                    }
                }

                Section {
                    Text("VitaForge \(Bundle.main.shortVersion) — calibration-first, no ads, no paywall.")
                        .font(.caption).foregroundStyle(Color.inkMuted)
                }
            }
            .navigationTitle("Settings")
        }
    }
}

extension Bundle {
    var shortVersion: String {
        (infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0.1.0"
    }
}

import SwiftUI

struct AuthView: View {
    @EnvironmentObject var session: Session

    enum Mode { case login, register }
    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var error: String?
    @State private var busy = false

    private var canSubmit: Bool {
        !email.isEmpty && password.count >= 8 && !busy
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 6) {
                    Image(systemName: "bolt.heart.fill").font(.system(size: 44)).foregroundStyle(Color.brand)
                    Text("VitaForge").font(.largeTitle.bold())
                    Text("Calibration-first calorie tracking")
                        .font(.subheadline).foregroundStyle(Color.inkMuted)
                }
                .padding(.top, 40)

                Picker("", selection: $mode) {
                    Text("Sign in").tag(Mode.login)
                    Text("Create account").tag(Mode.register)
                }
                .pickerStyle(.segmented)

                VStack(spacing: 12) {
                    if mode == .register {
                        TextField("Name (optional)", text: $fullName)
                            .textContentType(.name)
                            .fieldStyle()
                    }
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .fieldStyle()
                    SecureField("Password (min 8)", text: $password)
                        .textContentType(mode == .login ? .password : .newPassword)
                        .fieldStyle()
                }

                if let error {
                    Text(error).font(.footnote).foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(action: submit) {
                    HStack {
                        if busy { ProgressView().tint(.white) }
                        Text(mode == .login ? "Sign in" : "Create account").bold()
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                }
                .background(canSubmit ? Color.brand : Color.brand.opacity(0.4))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .disabled(!canSubmit)

                LanguagePicker()
                Spacer(minLength: 0)
            }
            .padding(20)
        }
        .background(Color.screenBg.ignoresSafeArea())
    }

    private func submit() {
        error = nil
        busy = true
        Task {
            do {
                if mode == .login {
                    try await session.login(email: email, password: password)
                } else {
                    try await session.register(
                        email: email,
                        password: password,
                        fullName: fullName.isEmpty ? nil : fullName
                    )
                }
            } catch {
                self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
            busy = false
        }
    }
}

/// Reusable inline language switcher (sends Accept-Language on every request).
struct LanguagePicker: View {
    @EnvironmentObject var session: Session
    var body: some View {
        Picker("Language", selection: Binding(
            get: { session.language },
            set: { session.setLanguage($0) }
        )) {
            ForEach(AppLanguage.allCases) { lang in
                Text(lang.display).tag(lang)
            }
        }
        .pickerStyle(.menu)
    }
}

extension View {
    func fieldStyle() -> some View {
        self.padding(12)
            .background(Color.cardBg)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

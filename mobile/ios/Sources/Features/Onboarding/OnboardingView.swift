import SwiftUI

/// One-screen onboarding. Saving the profile triggers the server-side norm
/// compute + opens the calibration window (MOBILE_API.md).
struct OnboardingView: View {
    @EnvironmentObject var session: Session

    @State private var sex: Sex = .male
    @State private var age = 30
    @State private var heightCm = 175.0
    @State private var weightKg = 75.0
    @State private var activity: ActivityLevel = .moderate
    @State private var goal: GoalKind = .lose
    @State private var rate = 0.5
    @State private var targetWeight = ""
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            Form {
                Section("About you") {
                    Picker("Sex", selection: $sex) {
                        Text("Male").tag(Sex.male)
                        Text("Female").tag(Sex.female)
                    }
                    Stepper("Age: \(age)", value: $age, in: 14...120)
                    HStack { Text("Height (cm)"); Spacer()
                        TextField("cm", value: $heightCm, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    HStack { Text("Weight (kg)"); Spacer()
                        TextField("kg", value: $weightKg, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    Picker("Activity", selection: $activity) {
                        ForEach(ActivityLevel.allCases) { Text(activityLabel($0)).tag($0) }
                    }
                }

                Section("Goal") {
                    Picker("Direction", selection: $goal) {
                        Text("Lose fat").tag(GoalKind.lose)
                        Text("Maintain").tag(GoalKind.maintain)
                        Text("Gain").tag(GoalKind.gain)
                    }
                    .pickerStyle(.segmented)

                    if goal != .maintain {
                        HStack { Text("Rate (kg / week)"); Spacer()
                            TextField("0.5", value: $rate, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                        HStack { Text("Target weight (kg)"); Spacer()
                            TextField("optional", text: $targetWeight).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    }
                }

                if let error {
                    Section { Text(error).foregroundStyle(.red).font(.footnote) }
                }

                Section {
                    Button(action: save) {
                        HStack { if busy { ProgressView() }; Text("Start").bold() }
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(busy)
                }
            }
            .navigationTitle("Set up your norm")
        }
    }

    private func activityLabel(_ a: ActivityLevel) -> String {
        switch a {
        case .sedentary: return "Sedentary"
        case .light: return "Light (1–3×/wk)"
        case .moderate: return "Moderate (3–5×/wk)"
        case .high: return "High (6–7×/wk)"
        case .very_high: return "Very high"
        }
    }

    private func save() {
        error = nil
        busy = true
        let payload = ProfileUpsert(
            sex: sex,
            age: age,
            heightCm: heightCm,
            currentWeightKg: weightKg,
            activityLevel: activity,
            goal: goal,
            targetRateKgPerWeek: goal == .maintain ? 0 : rate,
            targetWeightKg: goal == .maintain ? nil : Double(targetWeight)
        )
        Task {
            do {
                _ = try await API.saveProfile(payload)
                session.finishOnboarding()
            } catch {
                self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
            busy = false
        }
    }
}

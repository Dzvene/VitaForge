import SwiftUI

struct CalibrationView: View {
    @State private var status: CalibrationStatus?
    @State private var result: EstimateResult?
    @State private var loading = true
    @State private var working = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let status {
                        statusCard(status)
                        actionsCard(status)
                        if let result { resultCard(result) }
                    } else if loading {
                        ProgressView().padding(.top, 60)
                    } else if let error {
                        Text(error).foregroundStyle(.red)
                    }
                }
                .padding(16)
            }
            .background(Color.screenBg.ignoresSafeArea())
            .navigationTitle("Calibration")
            .task { await load() }
        }
    }

    private func statusCard(_ s: CalibrationStatus) -> some View {
        CardView {
            HStack {
                Text(s.phase == "completed" ? "Calibrated" : "Calibrating").font(.headline)
                Spacer()
                if let tdee = s.lastRealTdee {
                    Text("\(Int(tdee.rounded())) kcal").foregroundStyle(Color.brand).bold()
                }
            }
            ProgressView(value: Double(s.cleanDaysCollected), total: Double(max(s.windowDays, 1)))
                .tint(.brand)
            Text("\(s.cleanDaysCollected) / \(s.windowDays) clean days (a food log + a weigh-in)")
                .font(.caption).foregroundStyle(Color.inkMuted)
            if s.daysRemaining > 0 {
                Text("~\(s.daysRemaining) day(s) until the first estimate.")
                    .font(.caption).foregroundStyle(Color.inkMuted)
            }
        }
    }

    private func actionsCard(_ s: CalibrationStatus) -> some View {
        CardView {
            Text("Real maintenance is back-calculated from your actual intake + weight trend — not a formula guess.")
                .font(.subheadline).foregroundStyle(Color.inkMuted)
            HStack {
                Button {
                    Task { await run { try await API.calibrationRecalc() } }
                } label: {
                    if working { ProgressView() } else { Text("Recalculate") }
                }
                .buttonStyle(.borderedProminent)
                .disabled(working || !s.readyToEstimate)

                Button("Skip") {
                    Task { await run { try await API.calibrationSkip() } }
                }
                .buttonStyle(.bordered)
                .disabled(working)
            }
            if !s.readyToEstimate {
                Text("Collect more clean days before estimating.")
                    .font(.caption).foregroundStyle(Color.inkMuted)
            }
        }
    }

    private func resultCard(_ r: EstimateResult) -> some View {
        CardView {
            if r.ok {
                Text("Estimate updated").font(.headline)
                if let tdee = r.realTdee { row("Real maintenance", "\(Int(tdee.rounded())) kcal") }
                if let intake = r.avgDailyIntake { row("Avg intake", "\(Int(intake.rounded())) kcal") }
                if let change = r.trendChangeKg { row("Trend change", String(format: "%.2f kg", change)) }
                if let target = r.targetCalories { row("New target", "\(Int(target.rounded())) kcal") }
            } else {
                Label(r.reason ?? "Not enough data yet.", systemImage: "info.circle")
                    .foregroundStyle(Color.inkMuted)
            }
        }
    }

    private func row(_ k: String, _ v: String) -> some View {
        HStack { Text(k).foregroundStyle(Color.inkMuted); Spacer(); Text(v).bold() }
            .font(.subheadline)
    }

    private func load() async {
        loading = true
        error = nil
        do { status = try await API.calibrationStatus() }
        catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        loading = false
    }

    private func run(_ op: @escaping () async throws -> EstimateResult) async {
        working = true
        do {
            result = try await op()
            status = try await API.calibrationStatus()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        working = false
    }
}

import SwiftUI

struct TrendsView: View {
    @State private var trends: TrendsOut?
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let trends {
                        goalCard(trends.goal)
                        periodCard(trends.week, title: "Last 7 days")
                        periodCard(trends.month, title: "Last 30 days")
                        if let pace = trends.pace { paceCard(pace) }
                    } else if loading {
                        ProgressView().padding(.top, 60)
                    } else if let error {
                        Text(error).foregroundStyle(.red)
                    }
                }
                .padding(16)
            }
            .background(Color.screenBg.ignoresSafeArea())
            .navigationTitle("Trends")
            .task { await load() }
        }
    }

    @ViewBuilder
    private func goalCard(_ g: GoalOut) -> some View {
        if g.status != "no_target" {
            CardView {
                Text("Goal").font(.headline)
                if let pct = g.progressPct {
                    ProgressView(value: min(max(pct, 0), 100), total: 100).tint(.brand)
                }
                HStack {
                    if let start = g.startWeightKg { Text(String(format: "%.1f", start)) }
                    Spacer()
                    if let cur = g.currentWeightKg { Text(String(format: "%.1f kg", cur)).bold() }
                    Spacer()
                    if let target = g.targetWeightKg { Text(String(format: "%.1f", target)) }
                }
                .font(.caption).foregroundStyle(Color.inkMuted)
                Text(goalStatus(g)).font(.subheadline)
            }
        }
    }

    private func goalStatus(_ g: GoalOut) -> String {
        switch g.status {
        case "reached": return "Goal reached 🎉"
        case "on_track":
            if let w = g.etaWeeks { return "On track — about \(Int(w.rounded())) week(s) to go." }
            return "On track."
        case "off_track": return "Off track — the trend isn't moving toward the target."
        case "stalled": return "Stalled — no clear trend yet."
        case "no_data": return "Log weight to see progress."
        default: return ""
        }
    }

    private func periodCard(_ p: PeriodSummary, title: String) -> some View {
        CardView {
            Text(title).font(.headline)
            row("Logging", "\(p.daysLogged)/\(p.daysTotal) days (\(Int(p.loggingAdherencePct.rounded()))%)")
            if let avg = p.avg { row("Avg intake", "\(Int(avg.kcal.rounded())) kcal") }
            if let pct = p.onTargetPct { row("On target", "\(p.onTargetDays) days (\(Int(pct.rounded()))%)") }
            if let change = p.weightChangeKg, let rate = p.weeklyRateKg {
                row("Weight", String(format: "%+.2f kg (%+.2f/wk)", change, rate))
            }
        }
    }

    private func paceCard(_ pace: PaceOut) -> some View {
        CardView {
            Text("Pace").font(.headline)
            row("Target", String(format: "%+.2f kg/wk", pace.targetRateKgPerWeek))
            if let actual = pace.actualRateKgPerWeek {
                row("Actual", String(format: "%+.2f kg/wk", actual))
            }
            if let pct = pace.onPacePct { row("On pace", "\(Int(pct.rounded()))%") }
        }
    }

    private func row(_ k: String, _ v: String) -> some View {
        HStack { Text(k).foregroundStyle(Color.inkMuted); Spacer(); Text(v).bold() }.font(.subheadline)
    }

    private func load() async {
        loading = true
        error = nil
        do { trends = try await API.trends() }
        catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        loading = false
    }
}

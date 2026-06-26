import SwiftUI

struct DashboardView: View {
    @State private var target: TargetOut?
    @State private var day: DaySummary?
    @State private var guidance: [GuidanceItem] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let day, let target {
                        ringCard(day: day, target: target)
                        maintenanceCard(target)
                        if !guidance.isEmpty { guidanceCard }
                    } else if loading {
                        ProgressView().padding(.top, 80)
                    } else if let error {
                        Text(error).foregroundStyle(.red).padding(.top, 60)
                    }
                }
                .padding(16)
            }
            .background(Color.screenBg.ignoresSafeArea())
            .navigationTitle("Today")
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func ringCard(day: DaySummary, target: TargetOut) -> some View {
        CardView {
            HStack(alignment: .center, spacing: 16) {
                CalorieRing(eaten: day.eaten.kcal, target: day.target.calories)
                VStack(spacing: 12) {
                    MacroBar(label: "Protein", eaten: day.eaten.proteinG, target: day.target.proteinG, tint: .proteinColor)
                    MacroBar(label: "Fat", eaten: day.eaten.fatG, target: day.target.fatG, tint: .fatColor)
                    MacroBar(label: "Carbs", eaten: day.eaten.carbG, target: day.target.carbG, tint: .carbColor)
                }
            }
        }
    }

    private func maintenanceCard(_ target: TargetOut) -> some View {
        CardView {
            Text("Maintenance").font(.headline)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(Int(target.maintenanceKcal.rounded()))").font(.title2.bold())
                Text(target.maintenanceSource == "calibrated" ? "kcal/day · calibrated from your data" : "kcal/day · formula estimate")
                    .font(.caption).foregroundStyle(Color.inkMuted)
            }
            if target.rateClamped {
                Label("Rate clamped to a safe maximum.", systemImage: "exclamationmark.triangle")
                    .font(.caption).foregroundStyle(Color.fatColor)
            }
        }
    }

    private var guidanceCard: some View {
        CardView {
            Text("Guidance").font(.headline)
            ForEach(guidance) { item in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: icon(for: item.kind)).foregroundStyle(Color.brand)
                    Text(item.message).font(.subheadline)
                }
            }
        }
    }

    private func icon(for kind: String) -> String {
        switch kind {
        case "on_track": return "checkmark.circle"
        case "overage": return "info.circle"
        case "protein_low": return "fish"
        default: return "lightbulb"
        }
    }

    private func load() async {
        loading = true
        error = nil
        let today = DateUtil.today()
        do {
            async let t = API.target()
            async let d = API.day(today)
            async let g = API.dayGuidance(today)
            target = try await t
            day = try await d
            guidance = (try? await g)?.items ?? []
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        loading = false
    }
}

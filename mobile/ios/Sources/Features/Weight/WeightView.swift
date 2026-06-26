import Charts
import SwiftUI

struct WeightView: View {
    @State private var series: WeightSeries?
    @State private var input = ""
    @State private var loading = true
    @State private var error: String?
    @State private var saving = false

    private var loggedToday: Bool {
        series?.points.contains { $0.loggedOn == DateUtil.today() } ?? false
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    weighInCard
                    if let series, !series.points.isEmpty {
                        chartCard(series)
                    } else if loading {
                        ProgressView().padding(.top, 60)
                    } else if let error {
                        Text(error).foregroundStyle(.red)
                    } else {
                        Text("Log your weight daily — the trend line is what tracks progress.")
                            .font(.subheadline).foregroundStyle(Color.inkMuted)
                            .multilineTextAlignment(.center).padding(.top, 40)
                    }
                }
                .padding(16)
            }
            .background(Color.screenBg.ignoresSafeArea())
            .navigationTitle("Weight")
            .task { await load() }
        }
    }

    private var weighInCard: some View {
        CardView {
            Text("Today's weigh-in").font(.headline)
            if loggedToday {
                Label("Today's weight is logged", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Color.carbColor)
            } else {
                HStack {
                    TextField("kg", text: $input)
                        .keyboardType(.decimalPad)
                        .fieldStyle()
                        .frame(maxWidth: 140)
                    Button(action: save) {
                        if saving { ProgressView() } else { Text("Log").bold() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(Double(input) == nil || saving)
                }
            }
        }
    }

    private func chartCard(_ series: WeightSeries) -> some View {
        CardView {
            HStack {
                Text("Trend").font(.headline)
                Spacer()
                if let t = series.latestTrendKg {
                    Text("\(t, specifier: "%.1f") kg").foregroundStyle(Color.inkMuted)
                }
            }
            Chart {
                ForEach(Array(series.points.enumerated()), id: \.offset) { _, p in
                    LineMark(x: .value("Day", p.loggedOn), y: .value("Raw", p.weightKg))
                        .foregroundStyle(by: .value("Series", "Raw"))
                        .opacity(0.4)
                    LineMark(x: .value("Day", p.loggedOn), y: .value("Trend", p.trendKg))
                        .foregroundStyle(by: .value("Series", "Trend"))
                        .interpolationMethod(.catmullRom)
                }
            }
            .chartForegroundStyleScale(["Raw": Color.inkMuted, "Trend": Color.brand])
            .chartXAxis(.hidden)
            .frame(height: 220)
        }
    }

    private func load() async {
        loading = true
        error = nil
        do { series = try await API.weightSeries() }
        catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        loading = false
    }

    private func save() {
        guard let kg = Double(input) else { return }
        saving = true
        Task {
            do {
                try await API.logWeight(WeightLogIn(loggedOn: DateUtil.today(), weightKg: kg))
                input = ""
                await load()
            } catch {
                self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
            saving = false
        }
    }
}

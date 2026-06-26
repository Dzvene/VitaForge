import SwiftUI

struct DiaryView: View {
    @State private var day: DaySummary?
    @State private var loading = true
    @State private var error: String?
    @State private var showAdd = false

    private let today = DateUtil.today()

    var body: some View {
        NavigationStack {
            Group {
                if let day {
                    List {
                        ForEach(Meal.allCases) { meal in
                            let entries = day.entries.filter { $0.meal == meal }
                            if !entries.isEmpty {
                                Section(mealTitle(meal)) {
                                    ForEach(entries) { entry in
                                        entryRow(entry)
                                    }
                                }
                            }
                        }
                        if day.entries.isEmpty {
                            ContentUnavailableViewCompat(
                                title: "Nothing logged yet",
                                message: "Tap + to add your first food today."
                            )
                        }
                    }
                } else if loading {
                    ProgressView()
                } else if let error {
                    Text(error).foregroundStyle(.red)
                }
            }
            .navigationTitle("Diary")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .sheet(isPresented: $showAdd) {
                AddFoodView { await load() }
            }
        }
    }

    private func entryRow(_ entry: DiaryEntryOut) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.foodName).font(.subheadline.weight(.medium))
                Text("\(Int(entry.grams.rounded())) g · \(Int(entry.nutrients.kcal.rounded())) kcal")
                    .font(.caption).foregroundStyle(Color.inkMuted)
            }
            Spacer()
        }
        .swipeActions {
            Button(role: .destructive) {
                Task { await delete(entry.id) }
            } label: { Label("Delete", systemImage: "trash") }
        }
    }

    private func mealTitle(_ meal: Meal) -> String {
        switch meal {
        case .breakfast: return "Breakfast"
        case .lunch: return "Lunch"
        case .dinner: return "Dinner"
        case .snack: return "Snack"
        }
    }

    private func load() async {
        loading = true
        error = nil
        do { day = try await API.day(today) }
        catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        loading = false
    }

    private func delete(_ id: Int) async {
        do {
            try await API.deleteDiary(id)
            await load()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

/// Lightweight stand-in so we can target iOS 16 (ContentUnavailableView is 17+).
struct ContentUnavailableViewCompat: View {
    let title: String
    let message: String
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "tray").font(.largeTitle).foregroundStyle(Color.inkMuted)
            Text(title).font(.headline)
            Text(message).font(.subheadline).foregroundStyle(Color.inkMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
        .listRowSeparator(.hidden)
    }
}

import SwiftUI

/// Search the catalog (localized names via Accept-Language), pick a meal + grams,
/// and log the entry. The reload closure refreshes the diary on success.
struct AddFoodView: View {
    let onAdded: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var meal: Meal = defaultMeal()
    @State private var query = ""
    @State private var results: [FoodOut] = []
    @State private var searching = false
    @State private var selected: FoodOut?
    @State private var grams = 100.0
    @State private var error: String?
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Meal", selection: $meal) {
                    ForEach(Meal.allCases) { Text(label($0)).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding()

                List(results) { food in
                    Button { selected = food } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(food.name).foregroundStyle(.primary)
                            Text("\(Int(food.kcal100g.rounded())) kcal / 100 g" + (food.brand.map { " · \($0)" } ?? ""))
                                .font(.caption).foregroundStyle(Color.inkMuted)
                        }
                    }
                }
                .overlay {
                    if searching { ProgressView() }
                    else if results.isEmpty && !query.isEmpty {
                        Text("No matches").foregroundStyle(Color.inkMuted)
                    }
                }
            }
            .searchable(text: $query, prompt: "Search foods")
            .onChange(of: query) { _ in scheduleSearch() }
            .navigationTitle("Add food")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .sheet(item: $selected) { food in
                portionSheet(food)
            }
            .alert("Couldn't add", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(error ?? "") }
        }
    }

    private func portionSheet(_ food: FoodOut) -> some View {
        NavigationStack {
            Form {
                Section(food.name) {
                    HStack { Text("Grams"); Spacer()
                        TextField("g", value: $grams, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    let kcal = food.kcal100g * grams / 100
                    Text("\(Int(kcal.rounded())) kcal").foregroundStyle(Color.inkMuted)
                }
                Section {
                    Button("Add to \(label(meal))") { Task { await add(food) } }
                }
            }
            .navigationTitle("Portion")
            .presentationDetents([.medium])
        }
    }

    private func scheduleSearch() {
        searchTask?.cancel()
        let q = query.trimmingCharacters(in: .whitespaces)
        guard q.count >= 2 else { results = []; return }
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // debounce
            if Task.isCancelled { return }
            searching = true
            results = (try? await API.searchFoods(q)) ?? []
            searching = false
        }
    }

    private func add(_ food: FoodOut) async {
        do {
            _ = try await API.addDiary(DiaryAddIn(entryDate: DateUtil.today(), meal: meal, foodId: food.id, grams: grams))
            selected = nil
            await onAdded()
            dismiss()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func label(_ meal: Meal) -> String {
        switch meal {
        case .breakfast: return "Breakfast"
        case .lunch: return "Lunch"
        case .dinner: return "Dinner"
        case .snack: return "Snack"
        }
    }

    private static func defaultMeal() -> Meal {
        switch Calendar.current.component(.hour, from: Date()) {
        case 5..<11: return .breakfast
        case 11..<16: return .lunch
        case 16..<22: return .dinner
        default: return .snack
        }
    }
}
